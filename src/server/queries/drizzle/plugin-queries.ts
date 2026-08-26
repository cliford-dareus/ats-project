// ─────────────────────────────────────────────────────────────────────────────
//AutomationRules
// ─────────────────────────────────────────────────────────────────────────────

// ── GET ───────────────────────────────────────────────────────────────────────
import {automation_rules} from "@/drizzle/schema";
import {AutomationRule, type InstalledPlugin, OrgPluginRecord, type OrgPluginState} from "@/types";
import {db} from "@/drizzle/db";
import {and, eq} from "drizzle-orm";
import {AVAILABLE_PLUGINS} from "@/plugins/registry";

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
export async function db_get_org_plugin_state(orgId: string): Promise<OrgPluginState> {
    const record = await db_get_organization_plugins(orgId);
    const enabled = record.enabled ?? [];

    const flags: Record<string, boolean>  = {};
    const installed: InstalledPlugin[]    = [];

    for (const manifest of AVAILABLE_PLUGINS) {
        const settings  = record.settings?.[manifest.id];
        const isEnabled = enabled.includes(manifest.id) && settings?.active === true;
        flags[manifest.id] = isEnabled;

        if (isEnabled) {
            installed.push({
                ...manifest,
                settings: {
                    active:      true,
                    credentials: settings?.credentials ?? {},
                    config:      settings?.config      ?? {},
                },
            });
        }
    }

    return { flags, installed };
}

export async function db_get_organization_plugins(orgId: string): Promise<OrgPluginRecord> {
    // TODO: replace with real DB call
    // For demo purposes, return a record with some plugins enabled
    return {
        enabled: ["openai-scoring", "anthropic-screening", "calendly", "checkr", "resend", "google"],
        settings: {
            "openai-scoring": {
                active: true,
                credentials: { apiKey: process.env.OPENAI_API_KEY ?? "" },
            },
            "anthropic-screening": {
                active: true,
                credentials: { apiKey: process.env.ANTHROPIC_API_KEY ?? "" },
            },
            "calendly": {
                active: true,
                credentials: { oauthToken: process.env.CALENDLY_TOKEN ?? "" },
                config: { eventSlug: "acme-corp/interview" },
            },
            "checkr": {
                active: true,
                credentials: { apiKey: process.env.CHECKR_API_KEY ?? "" },
                config: { packageSlug: "checkr_standard" },
            },
            // "slack-notify": {
            //   active:      true,
            //   credentials: { webhookUrl: process.env.SLACK_WEBHOOK_URL ?? "" },
            //   config:      { channel: "#hiring" },
            // },
            "resend": {
                active: true,
                credentials: { apiKey: process.env.RESEND_API_KEY ?? "" },
                config: {
                    fromAddress: "atscompany@resend.dev",
                    companyName: "ATS Company",
                    hiringManagerEmail: "hiringmanager@example.com",
                    recruiterEmail: "sam@example.com",
                    offerSigningUrl: "",
                },
            },
            "google": {
                active: true,
                credentials: { apiKey: process.env.GOOGLE_GEMINI_API_KEY ?? "" },
            }
        },
    };
}

