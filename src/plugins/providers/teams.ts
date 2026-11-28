// Provider: Microsoft Teams Notifications  ·  2 live integrations
//
// Integrations:
//   1. teams-stage-changed      stage_changed       → post the move to Teams
//   2. teams-candidate-applied  candidate_applied   → post new applications
//
// Mechanism: ONE webhook URL per org (stored encrypted, like every
// other plugin secret). A webhook is bound to a single Teams channel when
// it is created — the payload cannot pick another channel, so there is no
// per-event channel routing here. The stored `channel` config value is a
// display label only ("General").
//
// The URL is either a Workflows (Power Automate) webhook — the current
// way to create one — or a classic Incoming Webhook (Office 365
// Connector). Microsoft is retiring Office 365 Connectors, so new setups
// should use Workflows; see src/lib/teams.ts for the payload and the
// honest success semantics (classic: 200 + body "1" = delivered;
// Workflows: 202 = accepted, delivery is async and unconfirmed).
//
// How events actually reach these integrations:
//   • candidate_applied — the BullMQ worker dispatches every enqueued event
//     through the plugin registry (worker/index.ts step 3) with a fresh
//     per-org registry and decrypted credentials, so this fires
//     automatically once the plugin is installed + connected + toggled on.
//   • stage_changed — stage moves are never enqueued to the worker; they
//     run through the automation engine from the kanban drag. Wire a rule
//     (trigger: stage_changed → action: fire_integration → this
//     integration) and the engine fires it — the browser path builds a
//     fresh per-org server registry for fire_integration (see
//     automation-engine-actions.ts), so the real webhook is used there too.
//   Do NOT claim stage moves auto-post without a rule: dispatch only sees
//   events the worker is handed, and no stage_changed event is enqueued today.
//
// Failures are never swallowed: execute() returns { success: false, error }
// with Teams' real response, the worker persists it as a
// `plugin.dispatch_failed` activity entry, and a failed automation rule
// surfaces as `automation.execution_failed` — the same as every other
// integration. No message is ever faked or simulated.

import { pluginRegistry } from "@/lib/plugin-registry";
import {
    buildCandidateAppliedMessage,
    buildStageChangedMessage,
    isTeamsWebhookUrl,
    postTeamsWebhook,
} from "@/lib/teams";
import { verifyTeamsWebhook } from "@/server/actions/plugin-actions";
import type { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import type {
    ATSContext,
    ATSIntegrationResult,
    InstalledPlugin,
    PluginAuthState,
    PluginCapability,
    SmartTrigger,
    TriggerEvent,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Shared base — both integrations post through the org's webhook.
// ─────────────────────────────────────────────────────────────────────────────
abstract class TeamsPostIntegration implements ATSIntegration {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly description: string;
    readonly icon = "🟪";
    readonly latency = "realtime" as const;
    readonly to = "teams";

    constructor(
        readonly providerId: string,
        private readonly getWebhookUrl: () => string,
        private readonly getChannel: () => string,
    ) { }

    abstract getSupportedTriggers(): SmartTrigger[];
    abstract execute(event: TriggerEvent, context: ATSContext): Promise<ATSIntegrationResult>;

    /** Best-effort actor name: the mover's Clerk id, resolved to an org member. */
    protected async resolveActorName(context: ATSContext): Promise<string | undefined> {
        const userId = context.user_id;
        if (!userId) return undefined;
        try {
            const { db_get_org_members } = await import(
                "@/server/queries/drizzle/organization"
            );
            const members = await db_get_org_members(context.organization_id);
            return members.find((m) => String(m.id) === String(userId))?.name ?? undefined;
        } catch {
            return undefined;
        }
    }

    protected async post(message: Parameters<typeof postTeamsWebhook>[1]): Promise<ATSIntegrationResult> {
        const webhookUrl = this.getWebhookUrl();
        if (!webhookUrl) {
            return {
                success: false,
                error: "Teams webhook URL is not configured — connect the Teams plugin in Settings first",
            };
        }
        // The webhook URL is a secret: it is passed only to Teams over
        // HTTPS and never logged (postTeamsWebhook logs nothing).
        const result = await postTeamsWebhook(webhookUrl, message);
        if (!result.ok) {
            return { success: false, error: `Teams rejected the message: ${result.error}` };
        }
        const channel = this.getChannel();
        console.log(
            `[Teams] Posted ${this.id}${channel ? ` → ${channel}` : ""}${result.accepted ? " (accepted by workflow — delivery async)" : ""}`,
        );
        return {
            success: true,
            data: {
                channel: channel || undefined,
                // A Workflows 202 means "accepted", not "in the channel" —
                // keep that distinction in the result, never flatten it
                // into a plain delivery claim.
                delivery: result.accepted ? "accepted" : "delivered",
            },
            metadata: { integration: this.id },
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration 1 — Stage Changed
// Fires on: stage_changed (via an automation rule's fire_integration action)
// Sends:    card "X moved from A to B • Job (Dept)" to the webhook's channel
// ─────────────────────────────────────────────────────────────────────────────
class StageChangedIntegration extends TeamsPostIntegration {
    readonly id = "teams-stage-changed";
    readonly name = "Teams Stage Change";
    readonly description = "Posts to Teams when a candidate moves to another pipeline stage.";

    getSupportedTriggers(): SmartTrigger[] {
        return [{
            id: "teams-on-stage-changed",
            name: "Post Stage Moves to Teams",
            description: "Post a message when a candidate moves stages.",
            on: ["stage_changed"],
        }];
    }

    async execute(event: TriggerEvent, context: ATSContext): Promise<ATSIntegrationResult> {
        if (event.type !== "stage_changed") return { success: false, error: "Unsupported event" };
        if (!context.candidate?.name) return { success: false, error: "No candidate in context" };
        const actorName = await this.resolveActorName(context);
        return this.post(buildStageChangedMessage(event, context, actorName));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration 2 — Candidate Applied
// Fires on: candidate_applied (worker dispatch — automatic, no rule needed)
// Sends:    card "New application: X (email) • Job (Dept)" to the webhook's channel
// ─────────────────────────────────────────────────────────────────────────────
class CandidateAppliedIntegration extends TeamsPostIntegration {
    readonly id = "teams-candidate-applied";
    readonly name = "Teams New Application";
    readonly description = "Posts to Teams when a candidate applies for a job.";

    getSupportedTriggers(): SmartTrigger[] {
        return [{
            id: "teams-on-candidate-applied",
            name: "Post New Applications to Teams",
            description: "Post a message when a candidate applies.",
            on: ["candidate_applied"],
        }];
    }

    async execute(event: TriggerEvent, context: ATSContext): Promise<ATSIntegrationResult> {
        if (event.type !== "candidate_applied") return { success: false, error: "Unsupported event" };
        if (!context.candidate?.name) return { success: false, error: "No candidate in context" };
        return this.post(buildCandidateAppliedMessage(event, context));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamsProvider — owns both integrations.
// ─────────────────────────────────────────────────────────────────────────────
export class TeamsProvider implements ATSPluginProvider {
    readonly id = "teams-notify";
    readonly name = "Microsoft Teams Notifications";
    readonly description = "Post to Teams channels when candidates move stages or key events fire.";
    readonly capabilities: PluginCapability[] = ["communication"];
    readonly providerColor = "#6264a7";

    private authState: PluginAuthState;
    private webhookUrl: string;
    private channel: string;

    constructor(installed: InstalledPlugin) {
        const storedUrl = installed.settings.credentials?.webhookUrl ?? "";
        this.channel = (installed.settings.config?.channel as string | undefined) ?? "";

        // A stored URL arrives MASKED (•••• + last 4) on the client and
        // must never count as verified: a masked value is truthy, so the
        // old `webhookUrl ? authenticated` check would show "Connected"
        // on every page load without any verification this session.
        // Only a real, unmasked URL authenticates, which only ever happens
        // server-side (decrypted at point of use); dispatch() skips
        // providers unless status is "authenticated", so server dispatch
        // is unaffected.
        this.webhookUrl = is_masked_value(storedUrl) ? "" : storedUrl;

        this.authState = this.webhookUrl
            ? { status: "authenticated", credentials: installed.settings.credentials }
            : { status: "unauthenticated" };
    }

    getAuthState(): PluginAuthState {
        return this.authState;
    }

    async authenticate(credentials: Record<string, string>): Promise<void> {
        this.authState = { status: "authenticating" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
        try {
            const webhookUrl = (credentials.webhookUrl ?? "").trim();
            if (!isTeamsWebhookUrl(webhookUrl)) {
                throw new Error("Enter a Teams webhook URL — from the Workflows app (…logic.azure.com…) or a classic Incoming Webhook (…webhook.office.com…)");
            }
            // Verify by posting a REAL test card to the webhook and
            // reporting Teams' real answer — a 2xx alone is not proof
            // (a Workflows 202 only means "accepted", and a classic
            // connector answers most bad calls with 200 + an error body).
            const result = await verifyTeamsWebhook(webhookUrl);
            if (!result.success) throw new Error(result.message);

            // Verified — but the browser must not retain a usable URL:
            // keep only the MASKED form in registry state and don't store
            // the full URL on the instance either. The caller persists it
            // via onSave right after; the encrypted server copy is the
            // only copy. Client-side integrations never execute (display only).
            this.webhookUrl = "";
            this.authState = { status: "authenticated", credentials: mask_credentials(credentials) };
            pluginRegistry.stateManager.setState(this.id, this.authState);
        } catch (e) {
            this.authState = { status: "error", error: (e as Error).message };
            pluginRegistry.stateManager.setState(this.id, this.authState);
            throw e;
        }
    }

    async deauthenticate(): Promise<void> {
        this.webhookUrl = "";
        this.authState = { status: "unauthenticated" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
    }

    getIntegrations(): ATSIntegration[] {
        const getWebhookUrl = () => this.webhookUrl;
        const getChannel = () => this.channel;
        return [
            new StageChangedIntegration(this.id, getWebhookUrl, getChannel),
            new CandidateAppliedIntegration(this.id, getWebhookUrl, getChannel),
        ];
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export const createTeamsProvider = (installed: InstalledPlugin) =>
    new TeamsProvider(installed);

// ── Mask helpers (client-safe) ────────────────────────────────────────────────
// src/lib/plugin-encryption.ts is server-only (node:crypto), so the masked
// check/mask is duplicated here in a few lines: a masked display value
// (`••••` + last 4, or the generic `••••••••` shown when decryption
// failed) is NEVER a usable webhook URL.
const is_masked_value = (value: string): boolean =>
    value.startsWith("••••");

const mask_value = (value: string): string =>
    !value || value.length <= 4 ? "••••••••" : `••••${value.slice(-4)}`;

/** Copy of a credentials map with every value masked (`••••` + last 4). */
const mask_credentials = (
    credentials: Record<string, string>,
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        out[name] = typeof value === "string" ? mask_value(value) : value;
    }
    return out;
};
