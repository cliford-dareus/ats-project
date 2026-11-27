// ─────────────────────────────────────────────────────────────────────────────
//AutomationRules
// ─────────────────────────────────────────────────────────────────────────────

// ── GET ───────────────────────────────────────────────────────────────────────
import {automation_rules, organization} from "@/drizzle/schema";
import {AutomationRule, type InstalledPlugin, OrgPluginRecord, type OrgPluginSettings, type OrgPluginState} from "@/types";
import {db} from "@/drizzle/db";
import {and, eq} from "drizzle-orm";
import {AVAILABLE_PLUGINS} from "@/plugins/registry";
import {decrypt_plugin_credentials, mask_plugin_settings} from "@/lib/plugin-encryption";

export const db_get_job_automation_rules = async (jobId: number, orgId: string): Promise<AutomationRule[]> => {
    const rows = await db
        .select()
        .from(automation_rules)
        .where(
            and(
                eq(automation_rules.job_id, jobId),
                eq(automation_rules.org_id, orgId),
            ),
        )
        .orderBy(automation_rules.created_at);

    return rows.map((r) => ({
        id: r.id.toString(),
        job_id: r.job_id,
        org_id: r.org_id,
        name: r.name,
        enabled: r.enabled as boolean,
        trigger: r.trigger as AutomationRule["trigger"],
        delay: r.delay as AutomationRule["delay"],
        action: r.action as AutomationRule["action"],
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
    }));
}

// ── SAVE (upsert) ─────────────────────────────────────────────────────────────
export const saveJobAutomationRule = async (jobId: number, rule: AutomationRule, orgId: string): Promise<AutomationRule> => {
    const isNew = rule.id.startsWith("rule_"); // client-generated temp ids
    if (isNew) {
        const [inserted] = await db
            .insert(automation_rules)
            .values({
                job_id: jobId,
                org_id: orgId,
                name: rule.name,
                enabled: rule.enabled,
                trigger: rule.trigger,
                delay: rule.delay,
                action: rule.action,
                created_at: new Date(),
                updated_at: new Date(),
            }).$returningId()

        const [new_rule] = await db.select()
            .from(automation_rules)
            .where(eq(automation_rules.id, inserted.id))
            .limit(1);

        return {
            ...rule,
            id: new_rule.id.toString(),
            created_at: new_rule.created_at.toISOString(),
            updated_at: new_rule.updated_at.toISOString(),
        };
    }

    // Existing rule — update
    await db
        .update(automation_rules)
        .set({
            name: rule.name,
            enabled: rule.enabled,
            trigger: rule.trigger,
            delay: rule.delay,
            action: rule.action,
            updated_at: new Date(),
        })
        .where(
            and(
                eq(automation_rules.id, rule.id),
                eq(automation_rules.job_id, jobId),
                eq(automation_rules.org_id, orgId),  // ← prevents cross-org writes
            ),
        );

    const [updated_rule] = await db.select()
        .from(automation_rules)
        .where(eq(automation_rules.id, rule.id))
        .limit(1);

    if (!updated_rule) throw new Error(`Rule ${rule.id} not found`);

    return {
        ...rule,
        updated_at: updated_rule.updated_at.toISOString(),
    };
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export const deleteJobAutomationRule = async (jobId: number, ruleId: string, orgId: string): Promise<void> => {
    await db
        .delete(automation_rules)
        .where(
            and(
                eq(automation_rules.id, ruleId),
                eq(automation_rules.job_id, jobId),
                eq(automation_rules.org_id, orgId),  // ← prevents cross-org deletes
            ),
        );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLUGINS QUERIES
// ─────────────────────────────────────────────────────────────────────────────
//
// Credentials in the `plugins` JSON column are stored ENCRYPTED at rest
// (AES-256-GCM, `enc:v1:` prefix — see src/lib/plugin-encryption.ts).
// Two read shapes exist and must not be confused:
//
//   • db_get_org_plugin_state / db_get_organization_plugins — SERVER-ONLY.
//     Credentials are DECRYPTED (point of use): the BullMQ worker, the
//     server-side plugin init, and server actions that send email with the
//     org's Resend key. Never return these to the client.
//   • db_get_org_plugin_state_for_client — CLIENT-FACING. Credentials are
//     MASKED (`••••` + last 4). This is the only shape server actions may
//     return to the browser.
// ─────────────────────────────────────────────────────────────────────────────

const build_org_plugin_state = (
    record: OrgPluginRecord,
    transform_settings: (settings: OrgPluginSettings) => OrgPluginSettings,
): OrgPluginState => {
    const enabled = record.enabled ?? [];

    const flags: Record<string, boolean>  = {};
    const installed: InstalledPlugin[]    = [];

    for (const manifest of AVAILABLE_PLUGINS) {
        // Manifest entries with no real provider (hasProvider !== true)
        // are "Coming soon": never report them as installed, even if an
        // older install left them enabled + active in the DB — there is
        // no factory or config UI behind them.
        if (!manifest.hasProvider) {
            flags[manifest.id] = false;
            continue;
        }

        const settings  = record.settings?.[manifest.id];
        // B4: a flagged plugin (credentials undecryptable) is never
        // installed — it must not dispatch with a missing key.
        const isEnabled = enabled.includes(manifest.id) && settings?.active === true && !settings?.credentialsError;
        flags[manifest.id] = isEnabled;

        if (isEnabled) {
            installed.push({
                ...manifest,
                settings: transform_settings({
                    active:      true,
                    credentials: settings?.credentials ?? {},
                    config:      settings?.config      ?? {},
                    enabledIntegrations: settings?.enabledIntegrations ?? {},
                }),
            });
        }
    }

    return { flags, installed };
}

// SERVER-ONLY: installed plugins with DECRYPTED credentials, for the worker
// and server-side plugin init / email sends. Never return to the client.
export async function db_get_org_plugin_state(orgId: string): Promise<OrgPluginState> {
    const record = await db_get_organization_plugins(orgId);
    return build_org_plugin_state(record, (settings) => settings);
}

// CLIENT-FACING: same shape, but credentials are MASKED (`••••` + last 4).
// Masking tolerates undecryptable values (generic mask), so a key-rotation
// mishap degrades the settings display instead of bricking the page.
export async function db_get_org_plugin_state_for_client(orgId: string): Promise<OrgPluginState> {
    const record = await db_get_organization_plugins_raw(orgId);
    return build_org_plugin_state(record, mask_plugin_settings);
}

// Raw read of the organization's plugins JSON column
// ({ enabled: string[], settings: Record<pluginId, OrgPluginSettings> }).
// Credentials are returned AS STORED (encrypted `enc:v1:` values, or legacy
// plaintext for keys that predate encryption). Server-only.
export async function db_get_organization_plugins_raw(orgId: string): Promise<OrgPluginRecord> {
    const [row] = await db
        .select({ plugins: organization.plugins })
        .from(organization)
        .where(eq(organization.clerk_id, orgId))
        .limit(1);

    const stored = (row?.plugins ?? {}) as Partial<OrgPluginRecord>;

    return {
        enabled: Array.isArray(stored.enabled) ? stored.enabled : [],
        settings: (stored.settings ?? {}) as Record<string, OrgPluginSettings>,
    };
}

// SERVER-ONLY point of use: same as the raw read, with credentials DECRYPTED.
// Legacy plaintext values (no `enc:v1:` prefix) pass through unchanged.
// B4 — fault-isolating: credentials are decrypted PER PLUGIN inside
// try/catch. One undecryptable value used to throw and poison the whole
// org blob (worker init, Resend sends). Now that plugin is skipped and
// flagged (`credentialsError: true`, credentials emptied) and the rest
// still load; build_org_plugin_state treats a flagged plugin as
// not-installed. The flag names the plugin id only — never a key value.
export async function db_get_organization_plugins(orgId: string): Promise<OrgPluginRecord> {
    const record = await db_get_organization_plugins_raw(orgId);

    const settings: Record<string, OrgPluginSettings> = {};
    for (const [pluginId, plugin_settings] of Object.entries(record.settings ?? {})) {
        if (!plugin_settings.credentials) {
            settings[pluginId] = plugin_settings;
            continue;
        }
        try {
            settings[pluginId] = {
                ...plugin_settings,
                credentials: decrypt_plugin_credentials(plugin_settings.credentials),
            };
        } catch (err) {
            console.warn(
                `[plugin-queries] Skipping plugin "${pluginId}" for org ${orgId}: credentials could not be decrypted (${err instanceof Error ? err.message : String(err)})`,
            );
            settings[pluginId] = {
                ...plugin_settings,
                credentials: {},
                credentialsError: true,
            };
        }
    }

    return { ...record, settings };
}

