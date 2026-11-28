// Provider: Zoom  ·  0 live integrations — manual scheduling only.
//
// REALITY CHECK (read this before "improving" it):
// Zoom creates real meetings through its Meetings API with Server-to-
// Server OAuth (account-level Account ID + Client ID + Client Secret,
// minted 1-hour token per call — no redirect URI, no user consent flow,
// no refresh token to store). JWT auth is deprecated by Zoom and is NOT
// used. User-level OAuth (authorization-code flow) was considered and
// rejected: meetings are hosted by the Zoom account owner either way,
// so per-recruiter consent buys nothing and costs a redirect URI +
// refresh-token storage.
//
// What this provider deliberately does NOT do:
//   • No per-recruiter hosting: meetings are created under /users/me,
//     which for a Server-to-Server app is the Zoom account owner (the
//     user who created the Marketplace app). Interviewers are recorded
//     on the interview and emailed, but they don't host their own Zoom
//     meeting.
//   • No stage-triggered "auto-send Zoom link" integration — scheduling
//     is a manual per-interview choice in the schedule modal (Google vs
//     Calendly vs Zoom, VIDEO only), like Calendly.
//   • No Google Calendar event on the Zoom path: the meeting lives in
//     Zoom; holds (tentative Google blocks) do not exist on this path.
//   • No webhook receiver in this build: Zoom meetings cancelled in
//     Zoom don't sync back — cancel from Applico.
//
// "authenticated" here means: the three credentials were verified
// against GET /users/me THIS session (mirrors the Calendly masked-key
// rule — a stored masked `••••` value never counts as verified). The
// provider holds no usable credentials client-side; the encrypted
// server copy is the only copy.
//
// Plan honesty: on a Basic (free) Zoom account, meetings with 3+
// participants are capped at 40 minutes — Zoom enforces that, Applico
// doesn't. The org must create + activate the Server-to-Server OAuth
// app in the Zoom Marketplace first (no public publish needed for its
// own account — publishing is only for distributing to other accounts).

import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyZoom } from "@/server/actions/plugin-actions";
import { InstalledPlugin, PluginAuthState, PluginCapability } from "@/types";

/** Zoom's brand color, for the config UI wordmark. */
export const ZOOM_BRAND_COLOR = "#2d8cff";

/** Scopes the org must select on the Server-to-Server OAuth app. */
export const ZOOM_REQUIRED_SCOPES = [
    "user:read:admin",
    "meeting:write:admin",
    "meeting:read:admin",
] as const;

export class ZoomProvider implements ATSPluginProvider {
    readonly id = "zoom";
    readonly name = "Zoom";
    readonly description =
        "Create a real Zoom meeting for a video interview: pick Zoom in the schedule modal and Applico creates the meeting via the Zoom Meetings API and stores the join link on the interview. No Google Calendar event is created on this path, and holds are not available — the meeting goes straight into Zoom.";
    readonly capabilities: PluginCapability[] = ["calendar_integration"];
    readonly providerColor = ZOOM_BRAND_COLOR;

    private authState: PluginAuthState;
    private hasUsableCredentials: boolean;

    constructor(installed: InstalledPlugin) {
        const credentials = installed.settings.credentials ?? {};
        // Same masked-key rule as Calendly: stored credentials arrive
        // MASKED (•••• + last 4) on the client and must never count as
        // verified. Only real, unmasked credentials authenticate — which
        // only ever happens server-side (decrypted at point of use).
        const values = [
            credentials.accountId ?? "",
            credentials.clientId ?? "",
            credentials.clientSecret ?? "",
        ];
        this.hasUsableCredentials =
            values.every((v) => v !== "" && !v.startsWith("••••"));
        this.authState = this.hasUsableCredentials
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
            // Verify against the live API: mint a token, then GET /users/me.
            // Bad credentials fail loudly with Zoom's real error.
            const result = await verifyZoom(
                credentials.accountId,
                credentials.clientId,
                credentials.clientSecret
            );
            if (!result.success) throw new Error(result.message);

            // Verified — but the browser must not retain usable
            // credentials: keep only the MASKED form in registry state
            // and don't store the full values on the instance either.
            // The caller persists them via onSave right after; the
            // encrypted server copy is the only copy. Client-side
            // integrations never execute.
            this.hasUsableCredentials = false;
            this.authState = {
                status: "authenticated",
                credentials: mask_credentials(credentials),
            };
            pluginRegistry.stateManager.setState(this.id, this.authState);
        } catch (e) {
            this.authState = { status: "error", error: (e as Error).message };
            pluginRegistry.stateManager.setState(this.id, this.authState);
            throw e;
        }
    }

    async deauthenticate(): Promise<void> {
        this.hasUsableCredentials = false;
        this.authState = { status: "unauthenticated" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
    }

    getIntegrations(): ATSIntegration[] {
        // No dispatch integrations exist: scheduling is a manual
        // per-interview choice in the schedule modal, not a trigger.
        // The `interview_scheduled` trigger is never dispatched, so
        // there is nothing for an auto-send integration to run on.
        return [];
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export const createZoomProvider = (installed: InstalledPlugin) =>
    new ZoomProvider(installed);

// ── Mask helpers (client-safe) ────────────────────────────────────────────────
// src/lib/plugin-encryption.ts is server-only (node:crypto), so the masked
// check/mask is duplicated here: a masked display value (`••••` + last 4,
// or the generic `••••••••` when decryption failed) is NEVER usable.
const mask_api_key = (value: string): string =>
    !value || value.length <= 4 ? "••••••••" : `••••${value.slice(-4)}`;

/** Copy of a credentials map with every value masked (`••••` + last 4). */
const mask_credentials = (
    credentials: Record<string, string>
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        out[name] = typeof value === "string" ? mask_api_key(value) : value;
    }
    return out;
};
