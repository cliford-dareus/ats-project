// ─────────────────────────────────────────────────────────────────────────────
// server/docusign.ts — DocuSign eSignature REST API v2.1 client (server-only).
//
// Auth: JWT grant (OAuth 2.0) — the server-to-server flow. DocuSign's
// Authorization Code grant needs a human at a browser to log in and a
// redirect/callback round trip per authorization, and this codebase has
// no OAuth redirect infrastructure for plugins (every other provider
// authenticates with a stored server credential: API key / PAT). JWT
// grant fits the shape exactly: a recruiter action sends an envelope
// unattended, after a one-time consent, with no human in the loop.
//
// What JWT grant needs (all stored encrypted via the existing plugin-key
// path, AES-256-GCM, server-only PLUGIN_ENCRYPTION_KEY):
//   • integrationKey — the app's Integration Key / OAuth client id (the
//     JWT `iss`). NOT the OAuth secret (JWT grant does not use one).
//   • userId — the GUID of the DocuSign user the integration impersonates
//     (the JWT `sub`; "API Username" on the Apps and Keys page).
//   • privateKey — the RSA private-key PEM whose public half is
//     registered on the DocuSign app (ADD RSA KEYPAIR). The private key
//     is NEVER logged, NEVER returned to the client, and is only ever
//     sent to DocuSign's token endpoint as the signature of a JWT
//     assertion — it is never sent as a bearer value or in a REST call.
//   • environment — demo or production. This selects the OAUTH host
//     only; the REST base URI is discovered per account from
//     GET /oauth/userinfo (production accounts live on na2 / na3 / eu…
//     data centers, so the base URI must never be guessed).
//
//     demo       → oauth https://account-d.docusign.com
//                   rest  https://demo.docusign.net/restapi (from userinfo)
//     production → oauth https://account.docusign.com
//                   rest  {base_uri}/restapi (from userinfo)
//
// One-time consent (org-side, DocuSign Admin — Applico cannot do this
// for the org): the impersonated user must grant the integration key
// the `signature impersonation` scope, once, either as individual
// consent (the consent URL in the settings UI, with a redirect URI
// registered on the app) or as admin consent for the whole org. Until
// consent exists the token exchange fails with `consent_required` —
// that error is surfaced verbatim, never swallowed. A production
// integration key additionally needs DocuSign's Go Live review (20+
// successful demo API calls) before it works in production at all.
//
// Ground truth (verified against developers.docusign.com, 2026-11-28):
//   • POST {oauth}/oauth/token — grant_type
//     urn:ietf:params:oauth:grant-type:jwt-bearer, assertion=<signed JWT>.
//     JWT: iss=integrationKey, sub=userId, aud={oauth host},
//     iat/exp (≤ 1h), scope="signature impersonation", signed RS256.
//     Response: { access_token, token_type: "Bearer", expires_in }.
//   • GET  {oauth}/oauth/userinfo — Bearer token. Returns the user's
//     accounts: [{ account_id, is_default, account_name, base_uri,
//     organization }]. base_uri is the REST base (e.g.
//     https://demo.docusign.net/restapi). Used both to verify a
//     connection and to discover account_id + base_uri at connect time.
//   • POST /restapi/v2.1/accounts/{accountId}/envelopes — create an
//     envelope. From a template: { templateId, templateRoles:
//     [{ roleName, name, email }], status: "sent", emailSubject }.
//     The template (offer-letter document + signature tabs + signer
//     role) is created in the DocuSign dashboard — Applico does not
//     generate offer-letter PDFs and never invents document content.
//     status "sent" sends immediately; "created" saves a draft.
//   • GET  /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId} —
//     envelope + recipient status. Envelope `status` (verbatim):
//     created / sent / delivered / signed / completed / declined /
//     voided. Recipient (signer) `status`: sent / delivered / completed
//     / declined / authenticationfailed / autofailed.
//   • PUT  /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId} —
//     { status: "voided", voidedReason } voids a sent envelope.
//   • GET  /restapi/v2.1/accounts/{accountId}/templates — the
//     account's templates (for the settings picker; a templateId the
//     account does not have fails envelope creation with DocuSign's
//     real error).
//
// No polling and no webhook receiver in this build — DocuSign
// recommends Connect webhooks (envelope-completed etc.) over polling,
// but registering one is out of scope (outbound webhooks are a
// separate, open item). Status is refreshed on demand from the
// application card, and the UI always shows when it was last refreshed.
//
// The access token is minted fresh per call in this build (one extra
// token exchange per action — acceptable for a recruiter-driven manual
// flow). Caching the token server-side until expiry is a follow-up.
//
// Every failure surfaces DocuSign's real error body/status — never a
// generic "failed". 429s are surfaced, never retry-looped.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "node:crypto";

import type { DocuSignEnvironment } from "@/types";

export const DOCUSIGN_OAUTH_BASES: Record<DocuSignEnvironment, string> = {
    demo: "https://account-d.docusign.com",
    production: "https://account.docusign.com",
};

export const DOCUSIGN_ENV_LABELS: Record<DocuSignEnvironment, string> = {
    demo: "Demo (sandbox) — test signatures, no legal weight",
    production: "Production — real, legally-binding signatures",
};

export class DocuSignApiError extends Error {
    readonly status: number;
    readonly detail: string;
    readonly code: string | null;
    constructor(status: number, detail: string, code: string | null = null) {
        super(detail || `DocuSign API error (HTTP ${status})`);
        this.name = "DocuSignApiError";
        this.status = status;
        this.detail = detail;
        this.code = code;
    }
    /** True for 429 rate-limit responses. */
    get isRateLimited(): boolean {
        return this.status === 429;
    }
    /** True when the impersonated user has not granted consent yet. */
    get isConsentRequired(): boolean {
        return this.code === "consent_required";
    }
}

export type DocuSignAccount = {
    accountId: string;
    accountName: string;
    baseUri: string;
    isDefault: boolean;
};

export type DocuSignUserInfo = {
    userId: string;
    name: string | null;
    email: string | null;
    accounts: DocuSignAccount[];
};

export type DocuSignTemplate = {
    templateId: string;
    name: string;
    description: string | null;
};

export type DocuSignEnvelope = {
    envelopeId: string;
    status: string;
    statusChangedDateTime: string | null;
    sentDateTime: string | null;
    completedDateTime: string | null;
    declinedDateTime: string | null;
    voidedReason: string | null;
    emailSubject: string | null;
    /** Verbatim status of the first signer (the candidate). */
    recipientStatus: string | null;
    recipientName: string | null;
    recipientEmail: string | null;
};

type DocuSignOAuthErrorBody = {
    error?: string;
    error_description?: string;
};

type DocuSignRestErrorBody = {
    errorCode?: string;
    message?: string;
};

function base64url(input: Buffer | string): string {
    const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
    return buf
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

/**
 * Normalize a pasted PEM: a key pasted with literal "\n" sequences
 * (from a .env-style single-line value) becomes real newlines. A key
 * that already has real newlines is untouched.
 */
export function normalize_private_key_pem(privateKey: string): string {
    const trimmed = privateKey.trim();
    if (trimmed.includes("\\n") && !trimmed.includes("\n")) {
        return trimmed.replace(/\\n/g, "\n");
    }
    return trimmed;
}

/**
 * Sign a JWT assertion for the JWT grant: RS256, iss = integration key,
 * sub = impersonated user id, aud = the OAuth host, exp 1h, scope
 * "signature impersonation". Built with node:crypto — no JWT library
 * dependency. The private key is used only to sign; it is never logged
 * or returned.
 */
export function sign_docusign_jwt(
    integrationKey: string,
    userId: string,
    privateKeyPem: string,
    environment: DocuSignEnvironment,
): string {
    const oauthBase = DOCUSIGN_OAUTH_BASES[environment];
    const header = { typ: "JWT", alg: "RS256" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: integrationKey,
        sub: userId,
        aud: oauthBase,
        iat: now,
        exp: now + 3600,
        scope: "signature impersonation",
    };
    const encoded = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
    let signature: Buffer;
    try {
        signature = crypto.sign("RSA-SHA256", Buffer.from(encoded, "utf8"), {
            key: normalize_private_key_pem(privateKeyPem),
        });
    } catch (err) {
        throw new Error(
            `Could not sign the DocuSign JWT with the provided RSA private key (${err instanceof Error ? err.message : String(err)}). The key must be the PEM downloaded from the DocuSign app (ADD RSA KEYPAIR).`,
        );
    }
    return `${encoded}.${base64url(signature)}`;
}

function oauth_error_detail(body: unknown, status: number): { detail: string; code: string | null } {
    if (body && typeof body === "object") {
        const b = body as DocuSignOAuthErrorBody;
        if (b.error) {
            const description = b.error_description ? `: ${b.error_description}` : "";
            // consent_required is the expected failure when the org has
            // not granted consent yet — say what to do, in the message.
            if (b.error === "consent_required") {
                return {
                    detail:
                        `DocuSign consent required: the impersonated user has not granted this integration key the "signature impersonation" scope. Grant consent once in DocuSign (Admin → consent, or the individual consent URL in Settings → DocuSign), then reconnect.${description}`,
                    code: b.error,
                };
            }
            return { detail: `DocuSign OAuth error (${b.error})${description}`, code: b.error };
        }
    }
    return { detail: `DocuSign OAuth error (HTTP ${status})`, code: null };
}

function rest_error_detail(body: unknown, status: number): { detail: string; code: string | null } {
    if (body && typeof body === "object") {
        const b = body as DocuSignRestErrorBody;
        if (b.errorCode || b.message) {
            const detail = b.message
                ? `DocuSign API error (HTTP ${status})${b.errorCode ? ` [${b.errorCode}]` : ""}: ${b.message}`
                : `DocuSign API error (HTTP ${status}) [${b.errorCode}]`;
            return { detail, code: b.errorCode ?? null };
        }
    }
    return { detail: `DocuSign API error (HTTP ${status})`, code: null };
}

/** Exchange a signed JWT assertion for an access token. */
export async function getDocuSignAccessToken(
    integrationKey: string,
    userId: string,
    privateKeyPem: string,
    environment: DocuSignEnvironment,
): Promise<string> {
    const oauthBase = DOCUSIGN_OAUTH_BASES[environment];
    const assertion = sign_docusign_jwt(integrationKey, userId, privateKeyPem, environment);

    let res: Response;
    try {
        res = await fetch(`${oauthBase}/oauth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion,
            }),
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        throw new Error(
            `Could not reach DocuSign (${err instanceof Error ? err.message : String(err)})`,
        );
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // Non-JSON body — fall through to status handling.
    }

    if (!res.ok) {
        const { detail, code } = oauth_error_detail(body, res.status);
        throw new DocuSignApiError(res.status, detail, code);
    }

    const token = (body as { access_token?: unknown })?.access_token;
    if (typeof token !== "string" || !token) {
        throw new Error("DocuSign token exchange succeeded but returned no access token");
    }
    return token;
}

/** GET /oauth/userinfo — validates the token and discovers the account's
 * account_id + base_uri (the REST base; never guessed). */
export async function getDocuSignUserInfo(
    accessToken: string,
    environment: DocuSignEnvironment,
): Promise<DocuSignUserInfo> {
    const oauthBase = DOCUSIGN_OAUTH_BASES[environment];
    let res: Response;
    try {
        res = await fetch(`${oauthBase}/oauth/userinfo`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        throw new Error(
            `Could not reach DocuSign (${err instanceof Error ? err.message : String(err)})`,
        );
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // Non-JSON body — fall through to status handling.
    }

    if (!res.ok) {
        const { detail, code } = oauth_error_detail(body, res.status);
        throw new DocuSignApiError(res.status, detail, code);
    }

    const b = body as {
        sub?: string;
        name?: string;
        email?: string;
        accounts?: {
            account_id?: string;
            account_name?: string;
            base_uri?: string;
            is_default?: string;
        }[];
    };
    return {
        userId: b.sub ?? "",
        name: b.name ?? null,
        email: b.email ?? null,
        accounts: (b.accounts ?? []).map((a) => ({
            accountId: a.account_id ?? "",
            accountName: a.account_name ?? "",
            baseUri: a.base_uri ?? "",
            isDefault: a.is_default === "true",
        })).filter((a) => a.accountId !== "" && a.baseUri !== ""),
    };
}

async function docusign_rest<T>(
    accessToken: string,
    baseUri: string,
    accountId: string,
    path: string,
    init?: RequestInit,
): Promise<T> {
    // base_uri from userinfo already ends in /restapi.
    const base = baseUri.replace(/\/$/, "");
    let res: Response;
    try {
        res = await fetch(`${base}/v2.1/accounts/${encodeURIComponent(accountId)}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...(init?.headers ?? {}),
            },
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        throw new Error(
            `Could not reach DocuSign (${err instanceof Error ? err.message : String(err)})`,
        );
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // Non-JSON body (e.g. an empty 204) — fall through.
    }

    if (!res.ok) {
        const { detail, code } = rest_error_detail(body, res.status);
        throw new DocuSignApiError(res.status, detail, code);
    }

    return body as T;
}

/** List the account's templates (offer-letter templates live here). */
export async function listDocuSignTemplates(
    accessToken: string,
    baseUri: string,
    accountId: string,
): Promise<DocuSignTemplate[]> {
    const res = await docusign_rest<{
        envelopeTemplates?: { templateId?: string; name?: string; description?: string }[];
    }>(accessToken, baseUri, accountId, "/templates?count=100");
    return (res.envelopeTemplates ?? []).map((t) => ({
        templateId: t.templateId ?? "",
        name: t.name ?? t.templateId ?? "",
        description: t.description ?? null,
    })).filter((t) => t.templateId !== "");
}

export type CreateEnvelopeInput = {
    templateId: string;
    /** Signer role name as defined on the template (e.g. "Candidate"). */
    roleName: string;
    signerName: string;
    signerEmail: string;
    emailSubject?: string;
};

/**
 * Create + send an envelope from a template. The template carries the
 * offer-letter document and its signature tabs; templateRoles binds
 * the candidate to the template's signer role. status "sent" sends
 * immediately — DocuSign emails the candidate the signing link.
 */
export async function createDocuSignEnvelopeFromTemplate(
    accessToken: string,
    baseUri: string,
    accountId: string,
    input: CreateEnvelopeInput,
): Promise<{ envelopeId: string; status: string }> {
    const res = await docusign_rest<{
        envelopeId?: string;
        status?: string;
    }>(
        accessToken,
        baseUri,
        accountId,
        "/envelopes",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                templateId: input.templateId,
                templateRoles: [
                    {
                        roleName: input.roleName,
                        name: input.signerName,
                        email: input.signerEmail,
                    },
                ],
                status: "sent",
                ...(input.emailSubject ? { emailSubject: input.emailSubject } : {}),
            }),
        },
    );
    if (!res.envelopeId) {
        throw new Error("DocuSign created an envelope but returned no envelopeId");
    }
    return { envelopeId: res.envelopeId, status: res.status ?? "sent" };
}

/** GET one envelope — status is DocuSign's verbatim value. */
export async function getDocuSignEnvelope(
    accessToken: string,
    baseUri: string,
    accountId: string,
    envelopeId: string,
): Promise<DocuSignEnvelope> {
    const res = await docusign_rest<{
        envelopeId?: string;
        status?: string;
        statusChangedDateTime?: string;
        sentDateTime?: string;
        completedDateTime?: string;
        declinedDateTime?: string;
        voidedReason?: string;
        emailSubject?: string;
        recipients?: {
            signers?: { status?: string; name?: string; email?: string }[];
        };
    }>(accessToken, baseUri, accountId, `/envelopes/${encodeURIComponent(envelopeId)}`);
    const signer = res.recipients?.signers?.[0];
    return {
        envelopeId: res.envelopeId ?? envelopeId,
        status: res.status ?? "",
        statusChangedDateTime: res.statusChangedDateTime ?? null,
        sentDateTime: res.sentDateTime ?? null,
        completedDateTime: res.completedDateTime ?? null,
        declinedDateTime: res.declinedDateTime ?? null,
        voidedReason: res.voidedReason ?? null,
        emailSubject: res.emailSubject ?? null,
        recipientStatus: signer?.status ?? null,
        recipientName: signer?.name ?? null,
        recipientEmail: signer?.email ?? null,
    };
}

/** Void a sent envelope (status "voided" + reason). */
export async function voidDocuSignEnvelope(
    accessToken: string,
    baseUri: string,
    accountId: string,
    envelopeId: string,
    reason: string,
): Promise<void> {
    await docusign_rest<unknown>(
        accessToken,
        baseUri,
        accountId,
        `/envelopes/${encodeURIComponent(envelopeId)}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "voided", voidedReason: reason }),
        },
    );
}
