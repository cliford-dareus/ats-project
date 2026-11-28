"use server";

// ─────────────────────────────────────────────────────────────────────────────
// server/actions/docusign-actions.ts — DocuSign offer letters.
//
// Tenant rule, as everywhere: the org ALWAYS comes from the Clerk session
// (getAuthOrThrow / requirePermission) and the application is proven to
// belong to it (assertApplicationBelongsToOrg, 404-style). No
// client-supplied orgId is ever trusted. Config reads are plugin:manage;
// per-application send/refresh/void are application:edit; reads are
// application:view. The DocuSign credentials (integration key, user id,
// RSA private key) are decrypted server-side only, sent only to
// DocuSign over HTTPS, never logged, never returned.
//
// Flow (template-based — the only sending path here):
//   1. The org creates an offer-letter template in the DocuSign
//      dashboard (document + signature tabs + a signer role, e.g.
//      "Candidate"). Applico does not generate offer-letter PDFs.
//   2. A recruiter, from an application in the Offer stage, confirms
//      the offer is final and sends. Applico creates an envelope from
//      the template, binding the candidate (name + email) to the
//      template's signer role with status "sent". DocuSign emails the
//      candidate the signing link.
//   3. Status is refreshed on demand (GET envelope). DocuSign's
//      verbatim envelope + signer statuses are stored — "completed"
//      is only ever DocuSign's word for signed. There is no live
//      polling and no Connect webhook receiver in this build.
//   4. A still-sent envelope can be voided from here. Once completed
//      or declined, voiding / re-sending is a DocuSign-dashboard or
//      new-envelope matter (a declined/voided envelope may be re-sent
//      as a fresh envelope from this card).
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/drizzle/db";
import { applications, candidates, docusign_envelopes, job_listings, stages } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import {
    assertApplicationBelongsToOrg,
    getAuthOrThrow,
    hasPermission,
    requirePermission,
} from "@/server/permissions";
import { db_get_organization_plugins } from "@/server/queries/drizzle/plugin-queries";
import {
    db_get_docusign_envelope,
    db_upsert_docusign_envelope,
    toDocuSignEnvelopeState,
    type DocuSignEnvelopeRow,
} from "@/server/queries/drizzle/docusign-queries";
import {
    createDocuSignEnvelopeFromTemplate,
    getDocuSignAccessToken,
    getDocuSignEnvelope,
    getDocuSignUserInfo,
    listDocuSignTemplates,
    voidDocuSignEnvelope,
    DocuSignApiError,
    type DocuSignTemplate,
} from "@/server/docusign";
import { record_activity } from "@/server/activity/record-activity";
import type { DocuSignEnvelopeState, DocuSignEnvironment } from "@/types";

type DocuSignPluginConfig = {
    integrationKey: string;
    userId: string;
    privateKey: string;
    environment: DocuSignEnvironment;
    templateId: string;
    roleName: string;
    emailSubject: string;
    accountId: string;
    baseUri: string;
};

/** Decrypted DocuSign settings for the session org (server-only). */
async function loadDocuSignConfig(orgId: string): Promise<DocuSignPluginConfig | null> {
    const record = await db_get_organization_plugins(orgId);
    const settings = record.settings?.docusign;
    if (!settings || settings.active !== true) return null;
    const integrationKey = settings.credentials?.integrationKey ?? "";
    const userId = settings.credentials?.userId ?? "";
    const privateKey = settings.credentials?.privateKey ?? "";
    if (!integrationKey || !userId || !privateKey) return null;
    const rawEnv = settings.config?.environment;
    // Safe default: anything other than an explicit "production" runs
    // in demo. A demo key must never silently sign against production.
    const environment: DocuSignEnvironment = rawEnv === "production" ? "production" : "demo";
    return {
        integrationKey,
        userId,
        privateKey,
        environment,
        templateId: typeof settings.config?.templateId === "string" ? settings.config.templateId : "",
        roleName: typeof settings.config?.roleName === "string" && settings.config.roleName !== "" ? settings.config.roleName : "Candidate",
        emailSubject: typeof settings.config?.emailSubject === "string" ? settings.config.emailSubject : "",
        accountId: typeof settings.config?.accountId === "string" ? settings.config.accountId : "",
        baseUri: typeof settings.config?.baseUri === "string" ? settings.config.baseUri : "",
    };
}

/** Mint a fresh access token for this org's stored credentials. */
async function accessTokenFor(config: DocuSignPluginConfig): Promise<string> {
    return getDocuSignAccessToken(
        config.integrationKey,
        config.userId,
        config.privateKey,
        config.environment,
    );
}

function toState(row: DocuSignEnvelopeRow): DocuSignEnvelopeState {
    return toDocuSignEnvelopeState(row);
}

function docusignFailure(err: unknown): { success: false; message: string } {
    if (err instanceof DocuSignApiError) {
        return { success: false, message: err.detail };
    }
    console.error("DocuSign action error:", err);
    return {
        success: false,
        message: (err as Error).message || "DocuSign request failed",
    };
}

/**
 * Validate DocuSign JWT credentials against the selected environment:
 * mint a token and call GET /oauth/userinfo. A bad key, bad user id,
 * bad private key, or missing consent fails loudly with DocuSign's
 * real error. On success, return the discovered account_id + base_uri
 * so the config UI can store them (the REST base is per-account and
 * must never be guessed). Called from the client-side DocuSign
 * provider auth flow (mirrors verifyCheckr). Nothing is persisted
 * here — saving is a separate, encrypting step.
 */
export async function verifyDocuSign(
    integrationKey: string,
    userId: string,
    privateKey: string,
    environment: DocuSignEnvironment,
): Promise<{
    success: boolean;
    message: string;
    accountId?: string;
    accountName?: string;
    baseUri?: string;
    userName?: string | null;
    userEmail?: string | null;
}> {
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    if (!integrationKey?.trim() || !userId?.trim() || !privateKey?.trim()) {
        return { success: false, message: "Integration key, user ID and RSA private key are all required" };
    }
    if (environment !== "demo" && environment !== "production") {
        return { success: false, message: "Environment must be demo or production" };
    }

    try {
        const accessToken = await getDocuSignAccessToken(
            integrationKey.trim(),
            userId.trim(),
            privateKey,
            environment,
        );
        const userInfo = await getDocuSignUserInfo(accessToken, environment);
        // Prefer the account the user marked default; fall back to the
        // first account DocuSign returns.
        const account =
            userInfo.accounts.find((a) => a.isDefault) ?? userInfo.accounts[0];
        if (!account) {
            return {
                success: false,
                message: "DocuSign authenticated, but no DocuSign account was returned for this user",
            };
        }
        return {
            success: true,
            message: `DocuSign credentials verified for ${environment === "production" ? "production" : "demo"} (account "${account.accountName}", user ${userInfo.name ?? userInfo.email ?? userId.trim()})`,
            accountId: account.accountId,
            accountName: account.accountName,
            baseUri: account.baseUri,
            userName: userInfo.name,
            userEmail: userInfo.email,
        };
    } catch (err) {
        console.error("DocuSign credential verification error:", err);
        return {
            success: false,
            message:
                err instanceof DocuSignApiError
                    ? err.detail
                    : (err as Error).message || "Failed to verify DocuSign credentials",
        };
    }
}

/** List the org's real DocuSign templates with the STORED credentials
 * (decrypted server-side — the browser never sees them). Recruiters
 * who can send an offer and admins who configure the plugin can both
 * list. */
export async function list_docusign_templates_action(): Promise<{
    success: boolean;
    templates?: DocuSignTemplate[];
    environment?: DocuSignEnvironment;
    message: string;
}> {
    const { orgId } = await getAuthOrThrow();
    const allowed =
        (await hasPermission("application:edit")) ||
        (await hasPermission("plugin:manage"));
    if (!allowed) {
        return { success: false, message: "Missing permission: application:edit" };
    }

    const config = await loadDocuSignConfig(orgId);
    if (!config) {
        return { success: false, message: "Connect DocuSign first" };
    }
    if (!config.accountId || !config.baseUri) {
        return {
            success: false,
            message: "DocuSign is connected but no account was stored — reconnect in Settings → DocuSign so the account can be discovered.",
        };
    }

    try {
        const accessToken = await accessTokenFor(config);
        const templates = await listDocuSignTemplates(accessToken, config.baseUri, config.accountId);
        return {
            success: true,
            templates,
            environment: config.environment,
            message: "Templates loaded",
        };
    } catch (err) {
        return docusignFailure(err);
    }
}

/** Current envelope state for one application, plus what the card needs
 * to render (plugin enabled, configured environment, default template).
 * Read-only values only — credentials are never in the response. */
export async function get_docusign_envelope_action(applicationId: number): Promise<{
    envelope: DocuSignEnvelopeState | null;
    pluginEnabled: boolean;
    environment: DocuSignEnvironment;
    defaultTemplateId: string;
    defaultRoleName: string;
    defaultEmailSubject: string;
}> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:view");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadDocuSignConfig(orgId);
    const row = await db_get_docusign_envelope(applicationId, orgId);
    return {
        envelope: row ? toState(row) : null,
        pluginEnabled: config !== null,
        environment: config?.environment ?? "demo",
        defaultTemplateId: config?.templateId ?? "",
        defaultRoleName: config?.roleName ?? "Candidate",
        defaultEmailSubject: config?.emailSubject ?? "",
    };
}

type ApplicationContext = {
    id: number;
    stageName: string | null;
    candidateName: string;
    candidateEmail: string;
    jobTitle: string | null;
};

async function loadApplicationContext(
    applicationId: number,
    orgId: string,
): Promise<ApplicationContext | null> {
    const [row] = await db
        .select({
            id: applications.id,
            stageName: stages.stage_name,
            candidateName: candidates.name,
            candidateEmail: candidates.email,
            jobTitle: job_listings.name,
        })
        .from(applications)
        .leftJoin(candidates, eq(applications.candidate, candidates.id))
        .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .where(
            and(
                eq(applications.id, applicationId),
                eq(applications.organization, orgId),
            ),
        )
        .limit(1);
    if (!row || !row.candidateName || !row.candidateEmail) return null;
    return {
        id: row.id,
        stageName: row.stageName,
        candidateName: row.candidateName,
        candidateEmail: row.candidateEmail,
        jobTitle: row.jobTitle,
    };
}

/** An envelope is "active" (re-sending refused) while DocuSign reports
 * it sent / delivered / signed. A new envelope may be sent after it is
 * completed (already signed — re-sending is pointless and refused),
 * declined, or voided. A draft ("created") never occurs here — we
 * always send immediately — but is not treated as active either. */
function isEnvelopeActive(envelope: DocuSignEnvelopeState | null): boolean {
    if (!envelope) return false;
    return (
        envelope.envelopeStatus === "sent" ||
        envelope.envelopeStatus === "delivered" ||
        envelope.envelopeStatus === "signed"
    );
}

/**
 * Send an offer letter for e-signature for an application in the Offer
 * stage. Deliberate recruiter action only — never automatic. Requires
 * the "offer is final" confirmation (recorded with who/when) and a
 * configured DocuSign template. Creates an envelope from the template
 * with status "sent"; DocuSign emails the candidate the signing link.
 */
export async function send_docusign_offer_action(
    applicationId: number,
    input: { confirmFinal: boolean; emailSubject?: string },
): Promise<{ success: boolean; message: string; envelope?: DocuSignEnvelopeState }> {
    const { orgId, userId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    if (!input.confirmFinal) {
        return {
            success: false,
            message:
                "Confirmation is required: confirm the offer letter is final and ready to send to the candidate before sending it for e-signature.",
        };
    }

    const config = await loadDocuSignConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "DocuSign is not connected for this organization. Connect it in Settings → DocuSign first.",
        };
    }
    if (!config.accountId || !config.baseUri) {
        return {
            success: false,
            message: "DocuSign is connected but no account was stored — reconnect in Settings → DocuSign so the account can be discovered.",
        };
    }
    if (!config.templateId) {
        return {
            success: false,
            message:
                "No offer-letter template is configured. Pick one of your DocuSign templates in Settings → DocuSign first — the template carries the offer-letter document and its signature tabs.",
        };
    }

    const ctx = await loadApplicationContext(applicationId, orgId);
    if (!ctx) {
        return { success: false, message: "Application not found" };
    }
    if (ctx.stageName !== "Offer") {
        return {
            success: false,
            message: `Offer letters are sent when a candidate receives an offer. This application is in the "${ctx.stageName ?? "unknown"}" stage — move it to the Offer stage first.`,
        };
    }

    const existing = await db_get_docusign_envelope(applicationId, orgId);
    const existingState = existing ? toState(existing) : null;
    if (isEnvelopeActive(existingState)) {
        return {
            success: false,
            message: `An offer letter is already out for signature (DocuSign status "${existingState?.envelopeStatus}"). Refresh its status instead, or void it before sending a new one.`,
        };
    }
    if (existingState?.envelopeStatus === "completed") {
        return {
            success: false,
            message: "This offer letter is already signed (DocuSign status \"completed\"). Sending another one would duplicate a signed offer.",
        };
    }

    const emailSubject =
        input.emailSubject?.trim() ||
        config.emailSubject ||
        `Please sign: your offer letter${ctx.jobTitle ? ` for ${ctx.jobTitle}` : ""}`;

    try {
        const accessToken = await accessTokenFor(config);
        const created = await createDocuSignEnvelopeFromTemplate(
            accessToken,
            config.baseUri,
            config.accountId,
            {
                templateId: config.templateId,
                roleName: config.roleName,
                signerName: ctx.candidateName,
                signerEmail: ctx.candidateEmail,
                emailSubject,
            },
        );

        // Read back the envelope DocuSign just created so the stored
        // status, sent time and signer status are DocuSign's own values.
        const envelope = await getDocuSignEnvelope(
            accessToken,
            config.baseUri,
            config.accountId,
            created.envelopeId,
        );

        const row = await db_upsert_docusign_envelope(
            {
                application_id: applicationId,
                organization: orgId,
                environment: config.environment,
                template_id: config.templateId,
                template_role_name: config.roleName,
                envelope_id: envelope.envelopeId,
                envelope_status: envelope.status || created.status,
                recipient_status: envelope.recipientStatus,
                recipient_name: envelope.recipientName ?? ctx.candidateName,
                recipient_email: envelope.recipientEmail ?? ctx.candidateEmail,
                email_subject: emailSubject,
                sent_by: userId,
                sent_at: envelope.sentDateTime ? new Date(envelope.sentDateTime) : new Date(),
                completed_at: envelope.completedDateTime ? new Date(envelope.completedDateTime) : null,
                declined_at: envelope.declinedDateTime ? new Date(envelope.declinedDateTime) : null,
                voided_reason: envelope.voidedReason,
                error_message: null,
            },
            {
                environment: config.environment,
                template_id: config.templateId,
                template_role_name: config.roleName,
                envelope_id: envelope.envelopeId,
                envelope_status: envelope.status || created.status,
                recipient_status: envelope.recipientStatus,
                recipient_name: envelope.recipientName ?? ctx.candidateName,
                recipient_email: envelope.recipientEmail ?? ctx.candidateEmail,
                email_subject: emailSubject,
                sent_by: userId,
                sent_at: envelope.sentDateTime ? new Date(envelope.sentDateTime) : new Date(),
                completed_at: envelope.completedDateTime ? new Date(envelope.completedDateTime) : null,
                declined_at: envelope.declinedDateTime ? new Date(envelope.declinedDateTime) : null,
                voided_reason: envelope.voidedReason,
                error_message: null,
            },
        );

        await record_activity({
            action: "docusign_offer_sent",
            entity_type: "application",
            entity_id: applicationId,
            summary: `Offer letter sent for e-signature via DocuSign (${config.environment}, template ${config.templateId}). DocuSign emailed ${ctx.candidateName} the signing link.`,
        });

        return {
            success: true,
            message:
                config.environment === "production"
                    ? "Offer letter sent (PRODUCTION — real, legally-binding signature). DocuSign emailed the candidate the signing link."
                    : "Offer letter sent (DEMO — test signature, no legal weight). DocuSign emailed the candidate the signing link.",
            envelope: toState(row),
        };
    } catch (err) {
        const failure = docusignFailure(err);
        // Record the failure on the row (when one exists) so the card
        // shows DocuSign's real error instead of silently showing nothing.
        if (existing) {
            await db
                .update(docusign_envelopes)
                .set({ error_message: failure.message })
                .where(eq(docusign_envelopes.id, existing.id));
        }
        return failure;
    }
}

/**
 * Re-read the envelope's status from DocuSign and store exactly what
 * DocuSign reports — envelope status, signer status, completed /
 * declined times, voided reason. No polling — the recruiter triggers
 * this from the card; the stored updated_at is the "last refreshed"
 * time shown in the UI.
 */
export async function refresh_docusign_envelope_action(
    applicationId: number,
): Promise<{ success: boolean; message: string; envelope?: DocuSignEnvelopeState }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadDocuSignConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "DocuSign is not connected for this organization.",
        };
    }
    if (!config.accountId || !config.baseUri) {
        return {
            success: false,
            message: "DocuSign is connected but no account was stored — reconnect in Settings → DocuSign so the account can be discovered.",
        };
    }

    const existing = await db_get_docusign_envelope(applicationId, orgId);
    if (!existing || !existing.envelope_id) {
        return { success: false, message: "No offer letter has been sent for this application." };
    }

    try {
        const accessToken = await accessTokenFor(config);
        const envelope = await getDocuSignEnvelope(
            accessToken,
            config.baseUri,
            config.accountId,
            existing.envelope_id,
        );

        const previousStatus = existing.envelope_status;
        await db
            .update(docusign_envelopes)
            .set({
                envelope_status: envelope.status,
                recipient_status: envelope.recipientStatus,
                recipient_name: envelope.recipientName ?? existing.recipient_name,
                recipient_email: envelope.recipientEmail ?? existing.recipient_email,
                completed_at: envelope.completedDateTime
                    ? new Date(envelope.completedDateTime)
                    : existing.completed_at,
                declined_at: envelope.declinedDateTime
                    ? new Date(envelope.declinedDateTime)
                    : existing.declined_at,
                voided_reason: envelope.voidedReason ?? existing.voided_reason,
                error_message: null,
            })
            .where(eq(docusign_envelopes.id, existing.id));

        // A status that flipped to a terminal state is worth an activity
        // entry — it is the moment the offer was actually signed (or
        // declined), in DocuSign's words.
        if (previousStatus !== envelope.status && envelope.status === "completed") {
            await record_activity({
                action: "docusign_offer_completed",
                entity_type: "application",
                entity_id: applicationId,
                summary: "Offer letter signed in DocuSign (envelope status \"completed\").",
            });
        } else if (previousStatus !== envelope.status && envelope.status === "declined") {
            await record_activity({
                action: "docusign_offer_declined",
                entity_type: "application",
                entity_id: applicationId,
                summary: "Offer letter declined in DocuSign (envelope status \"declined\").",
            });
        }

        const updated = await db_get_docusign_envelope(applicationId, orgId);
        return {
            success: true,
            message: "Status refreshed from DocuSign.",
            envelope: updated ? toState(updated) : undefined,
        };
    } catch (err) {
        const failure = docusignFailure(err);
        await db
            .update(docusign_envelopes)
            .set({ error_message: failure.message })
            .where(eq(docusign_envelopes.id, existing.id));
        return failure;
    }
}

/**
 * Void a still-sent envelope (DocuSign status "voided"). Once the
 * candidate has signed or declined, the envelope can no longer be
 * voided from here — it is closed in DocuSign. A voided envelope may
 * be re-sent as a fresh envelope from the card.
 */
export async function void_docusign_envelope_action(
    applicationId: number,
    reason?: string,
): Promise<{ success: boolean; message: string; envelope?: DocuSignEnvelopeState }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadDocuSignConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "DocuSign is not connected for this organization.",
        };
    }
    if (!config.accountId || !config.baseUri) {
        return {
            success: false,
            message: "DocuSign is connected but no account was stored — reconnect in Settings → DocuSign so the account can be discovered.",
        };
    }

    const existing = await db_get_docusign_envelope(applicationId, orgId);
    if (!existing || !existing.envelope_id) {
        return { success: false, message: "No offer letter has been sent for this application." };
    }
    if (
        existing.envelope_status !== "sent" &&
        existing.envelope_status !== "delivered"
    ) {
        return {
            success: false,
            message: `This envelope can no longer be voided — DocuSign reports it as "${existing.envelope_status ?? "unknown"}". Voiding only works while it is sent or delivered.`,
        };
    }

    const voidedReason = reason?.trim() || "Offer letter voided in Applico";

    try {
        const accessToken = await accessTokenFor(config);
        await voidDocuSignEnvelope(
            accessToken,
            config.baseUri,
            config.accountId,
            existing.envelope_id,
            voidedReason,
        );

        await db
            .update(docusign_envelopes)
            .set({ envelope_status: "voided", voided_reason: voidedReason, error_message: null })
            .where(eq(docusign_envelopes.id, existing.id));

        await record_activity({
            action: "docusign_offer_voided",
            entity_type: "application",
            entity_id: applicationId,
            summary: `Offer letter voided in DocuSign (${voidedReason}).`,
        });

        const updated = await db_get_docusign_envelope(applicationId, orgId);
        return {
            success: true,
            message: "Envelope voided in DocuSign.",
            envelope: updated ? toState(updated) : undefined,
        };
    } catch (err) {
        return docusignFailure(err);
    }
}
