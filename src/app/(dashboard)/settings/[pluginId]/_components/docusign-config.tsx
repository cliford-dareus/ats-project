'use client';

// DocuSign config — JWT credentials, environment (demo vs production),
// offer-letter template.
//
// Honest states (same masked-key rule as Google/Resend/Calendly/Checkr):
//   • "Connected · DocuSign API verified this session" — this session's
//     credentials were just verified against GET /oauth/userinfo on the
//     selected environment's OAuth host.
//   • "Saved · credentials stored, not verified this session" — masked
//     credentials are stored; nothing was verified this session.
//   • "Not connected" — no credentials stored.
//
// The RSA private key is never displayed, even masked: its last 4
// characters ("-----") carry no identity, so a saved key shows only the
// generic "••••••••". The key is pasted once (PEM text) and stored
// encrypted (AES-256-GCM) server-side; re-entering replaces it.
//
// Environment is load-bearing, not a label:
//   • Demo = account-d.docusign.com — sandbox account, test signatures,
//     no legal weight. Demo and production are SEPARATE DocuSign
//     accounts with separate integration keys, so switching environments
//     requires disconnecting and entering the other environment's
//     credentials — the selector is locked while credentials are saved,
//     rather than silently reusing a demo key against production.
//   • Production = account.docusign.com — real, legally-binding
//     signatures. A production integration key additionally needs
//     DocuSign's Go Live review (20+ successful demo API calls) before
//     it works in production at all.
//
// What DocuSign does here (stated in the UI, not just in code):
//   • Sending is a manual recruiter action on the application page,
//     gated on the Offer stage + an explicit "offer is final"
//     confirmation. Nothing auto-sends an offer letter.
//   • The offer letter lives in a DocuSign template the org creates in
//     the DocuSign dashboard (document + signature tabs + signer role).
//     Applico binds the candidate to the template's signer role and
//     creates the envelope with status "sent"; DocuSign emails the
//     candidate the signing link. Applico does not generate
//     offer-letter PDFs.
//   • Status is refreshed on demand from the application card. There is
//     no live polling and no Connect webhook receiver in this build.
//   • Consent is org-side and one-time: the impersonated user must
//     grant this integration key the "signature impersonation" scope
//     (admin consent, or the individual consent URL below) before the
//     first send. Until then every call fails with DocuSign's
//     `consent_required` error, surfaced verbatim.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { DOCUSIGN_BRAND_COLOR } from "@/plugins/providers/docusign";
import {
    list_docusign_templates_action,
    verifyDocuSign,
} from "@/server/actions/docusign-actions";
import type { DocuSignEnvironment } from "@/types";
import { ConfigProps } from "./shared/types";

type TemplateOption = { templateId: string; name: string; description: string | null };

const DocuSignConfig = ({ pluginId, settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState(pluginId);

    const maskedIntegrationKey =
        typeof settings?.credentials?.integrationKey === "string"
            ? settings.credentials.integrationKey
            : "";
    const maskedUserId =
        typeof settings?.credentials?.userId === "string" ? settings.credentials.userId : "";
    const maskedPrivateKey =
        typeof settings?.credentials?.privateKey === "string"
            ? settings.credentials.privateKey
            : "";
    const hasSavedCredentials = !!maskedIntegrationKey || !!maskedUserId || !!maskedPrivateKey;
    const isConnected = auth.status === "authenticated";
    const savedEnvironment = (
        settings?.config?.environment === "production" ? "production" : "demo"
    ) as DocuSignEnvironment;
    const savedTemplateId =
        typeof settings?.config?.templateId === "string" ? settings.config.templateId : "";
    const savedRoleName =
        typeof settings?.config?.roleName === "string" && settings.config.roleName !== ""
            ? settings.config.roleName
            : "Candidate";
    const savedEmailSubject =
        typeof settings?.config?.emailSubject === "string" ? settings.config.emailSubject : "";
    const savedAccountId =
        typeof settings?.config?.accountId === "string" ? settings.config.accountId : "";
    const savedBaseUri =
        typeof settings?.config?.baseUri === "string" ? settings.config.baseUri : "";

    const [integrationKey, setIntegrationKey] = useState("");
    const [userId, setUserId] = useState("");
    const [privateKey, setPrivateKey] = useState("");
    const [environment, setEnvironment] = useState<DocuSignEnvironment>(savedEnvironment);
    const [connectError, setConnectError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const [templates, setTemplates] = useState<TemplateOption[]>([]);
    const [templatesError, setTemplatesError] = useState<string | null>(null);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templateId, setTemplateId] = useState(savedTemplateId);
    const [roleName, setRoleName] = useState(savedRoleName);
    const [emailSubject, setEmailSubject] = useState(savedEmailSubject);
    const [templateSaved, setTemplateSaved] = useState(false);
    const [templateError, setTemplateError] = useState<string | null>(null);

    const loadTemplates = async () => {
        setTemplatesLoading(true);
        setTemplatesError(null);
        try {
            const result = await list_docusign_templates_action();
            if (result.success) setTemplates(result.templates ?? []);
            else setTemplatesError(result.message);
        } catch (err) {
            setTemplatesError((err as Error).message || "Failed to load templates");
        } finally {
            setTemplatesLoading(false);
        }
    };

    // Stored credentials mean the org is connected even before this
    // session verifies them — load the live template list so the page
    // shows what DocuSign can actually send.
    useEffect(() => {
        if (!hasSavedCredentials && !isConnected) return;
        loadTemplates();
    }, [hasSavedCredentials, isConnected]);

    useEffect(() => {
        setTemplateId(savedTemplateId);
    }, [savedTemplateId]);
    useEffect(() => {
        setRoleName(savedRoleName);
    }, [savedRoleName]);
    useEffect(() => {
        setEmailSubject(savedEmailSubject);
    }, [savedEmailSubject]);

    const handleConnect = async () => {
        const key = integrationKey.trim();
        const uid = userId.trim();
        const pem = privateKey.trim();
        if (!key || !uid || !pem) return;
        setConnectError(null);
        try {
            // 1. Verify ONLY — JWT token exchange + GET /oauth/userinfo
            // on the selected environment's OAuth host. No badge change yet.
            const check = await verifyDocuSign(key, uid, pem, environment);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never
            // claimed "Connected" for credentials that aren't stored.
            // accountId + baseUri are discovered by verify (never
            // guessed) and stored alongside.
            await onSave({
                ...settings,
                active: true,
                credentials: { integrationKey: key, userId: uid, privateKey: pem },
                config: {
                    ...(settings.config ?? {}),
                    environment,
                    templateId: templateId || "",
                    roleName,
                    emailSubject,
                    accountId: check.accountId ?? "",
                    baseUri: check.baseUri ?? "",
                },
            });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies and keeps only the masked credentials client-side.
            await authenticate(pluginId, {
                integrationKey: key,
                userId: uid,
                privateKey: pem,
                environment,
            });
            setIntegrationKey("");
            setUserId("");
            setPrivateKey("");
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect DocuSign");
        }
    };

    const handleDisconnect = async () => {
        setConnectError(null);
        try {
            // Clear server-side FIRST; only drop the local auth state on
            // success, so a failed clear doesn't leave the UI claiming
            // "Not connected" while the server still holds credentials.
            await onSave({
                ...settings,
                active: false,
                credentials: {},
                config: {
                    ...(settings.config ?? {}),
                    environment: "demo",
                    templateId: "",
                    roleName: "Candidate",
                    emailSubject: "",
                    accountId: "",
                    baseUri: "",
                },
            });
            setIntegrationKey("");
            setUserId("");
            setPrivateKey("");
            setEnvironment("demo");
            setTemplates([]);
            setTemplateId("");
            setRoleName("Candidate");
            setEmailSubject("");
            await pluginRegistry.getProvider(pluginId)?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect DocuSign");
        }
    };

    const handleSaveTemplate = async () => {
        const tid = templateId.trim();
        if (!tid) {
            setTemplateError("Pick a template from the list above, or enter a template ID.");
            return;
        }
        if (!roleName.trim()) {
            setTemplateError("Enter the signer role name as defined on the template.");
            return;
        }
        setTemplateError(null);
        try {
            // Config-only save: the masked credentials echo preserves the
            // stored credentials server-side (see plugin-encryption).
            await onSave({
                ...settings,
                config: {
                    ...(settings.config ?? {}),
                    templateId: tid,
                    roleName: roleName.trim(),
                    emailSubject: emailSubject.trim(),
                },
            });
            setTemplateSaved(true);
            setTimeout(() => setTemplateSaved(false), 2500);
        } catch (e) {
            setTemplateError((e as Error).message || "Failed to save template");
        }
    };

    const oauthBase =
        environment === "production"
            ? "https://account.docusign.com"
            : "https://account-d.docusign.com";
    const consentUrl = `${oauthBase}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey.trim() || "{integration-key}"}&redirect_uri={a-redirect-uri-registered-on-the-app}`;

    return (
        <div className="space-y-8">
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full"
                        style={{ backgroundColor: DOCUSIGN_BRAND_COLOR }}
                    >
                        <span className="text-white text-sm font-black">D</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">DocuSign</div>
                        <div className="text-xs text-background/20">
                            Offer letters · {savedEnvironment === "production" ? "PRODUCTION" : "Demo (sandbox)"}
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                <div
                    className="flex items-center gap-6 py-1 px-3 rounded-md text-sm"
                    style={{
                        background: isConnected ? "#0d1a14" : hasSavedCredentials ? "#171207" : "#111",
                        border: `1px solid ${isConnected ? "#10b981" : hasSavedCredentials ? "#f59e0b" : "#1f1f1f"}`,
                        color: isConnected ? "#10b981" : hasSavedCredentials ? "#f59e0b" : "#4b5563",
                    }}>
                    <div className="w-5 h-5 rounded-full bg-card shadow-[0_0_4px_#10b981] dark:bg-card dark:shadow-[0_0_4px_#374151]">
                        <div className="w-5 h-5 rounded-full" style={{ background: isConnected ? "#10b981" : hasSavedCredentials ? "#f59e0b" : "#374151" }} />
                    </div>
                    {isConnected ? "Connected" : hasSavedCredentials ? "Saved" : "Not connected"}
                </div>

                {saved && (
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "#10b981" }}>
                        ✓ Saved
                    </span>
                )}
            </div>

            {connectError && (
                <div role="alert" className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    ⚠ {connectError}
                </div>
            )}

            <div className="rounded-md border p-6 space-y-2">
                <h2 className="text-lg font-semibold">What DocuSign does here — and what it doesn&apos;t</h2>
                <p className="text-sm text-muted-foreground">
                    When DocuSign is connected, a recruiter can send an offer letter for e-signature
                    from an application in the Offer stage — a deliberate action, never automatic.
                    Applico creates an envelope from the offer-letter template below, binding the
                    candidate to the template&apos;s signer role; DocuSign emails the candidate the
                    signing link. The envelope status (sent, delivered, signed, completed, declined,
                    voided) is DocuSign&apos;s verbatim word, refreshed on demand from the application
                    page.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>No offer letter ever sends on its own — sending requires the Offer stage plus an explicit &ldquo;offer is final&rdquo; confirmation, recorded with who confirmed and when.</li>
                    <li>Applico does not generate offer letters. The document and its signature tabs live in the DocuSign template — create the template in DocuSign first, then pick it below.</li>
                    <li>The candidate signs through DocuSign&apos;s emailed link, not inside Applico. There is no embedded signing here.</li>
                    <li>No live polling and no Connect webhook receiver in this build — the application card shows when the status was last refreshed from DocuSign.</li>
                </ul>
            </div>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Environment</h2>
                <p className="text-sm text-muted-foreground">
                    Demo uses the sandbox OAuth host (<code className="font-mono text-xs">account-d.docusign.com</code>) — test
                    signatures with no legal weight. Production uses <code className="font-mono text-xs">account.docusign.com</code> — real,
                    legally-binding signatures. Demo and production are separate DocuSign accounts with
                    separate integration keys, so switching environments requires disconnecting and
                    entering the other environment&apos;s credentials. The REST base address is discovered
                    from DocuSign for your account — it is never guessed.
                </p>
                <div className="flex gap-2">
                    {(["demo", "production"] as DocuSignEnvironment[]).map((env) => (
                        <Button
                            key={env}
                            type="button"
                            variant={environment === env ? "default" : "outline"}
                            onClick={() => setEnvironment(env)}
                            disabled={hasSavedCredentials || isConnected}
                        >
                            {env === "demo" ? "Demo (sandbox)" : "Production"}
                        </Button>
                    ))}
                </div>
                {(hasSavedCredentials || isConnected) && (
                    <p className="text-sm text-amber-600">
                        Environment is locked while credentials are saved — disconnect to switch environments.
                        Currently configured: <span className="font-semibold">{savedEnvironment === "production" ? "Production" : "Demo (sandbox)"}</span>.
                        {savedAccountId && (
                            <> · Account <code className="font-mono text-xs">{savedAccountId}</code></>
                        )}
                        {savedBaseUri && (
                            <> · <code className="font-mono text-xs">{savedBaseUri}</code></>
                        )}
                    </p>
                )}
                {environment === "production" && !hasSavedCredentials && (
                    <p className="text-sm text-amber-600">
                        Production sends real, legally-binding offer letters. Your production integration
                        key must also pass DocuSign&apos;s Go Live review (20+ successful demo API calls)
                        before it works in production at all — test in demo first.
                    </p>
                )}
            </div>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Authentication — JWT grant</h2>
                <p className="text-sm text-muted-foreground">
                    Applico authenticates server-to-server with DocuSign&apos;s JWT grant: the integration
                    key and RSA private key mint a short-lived access token — no browser login, no
                    redirect. Credentials are encrypted at rest (AES-256-GCM) and never sent back to the
                    browser. The private key is pasted once and never displayed again, not even masked.
                </p>

                {(hasSavedCredentials || isConnected) && (
                    <div className="rounded-md bg-muted px-4 py-3 text-sm space-y-1">
                        <p><span className="font-semibold">Integration key:</span> <code className="font-mono text-xs">{maskedIntegrationKey || "••••••••"}</code></p>
                        <p><span className="font-semibold">User ID:</span> <code className="font-mono text-xs">{maskedUserId || "••••••••"}</code></p>
                        <p><span className="font-semibold">RSA private key:</span> <code className="font-mono text-xs">•••••••• (saved — never displayed)</code></p>
                        <p className="text-muted-foreground">
                            {isConnected
                                ? "Connected · DocuSign API verified this session"
                                : "Saved · credentials stored, not verified this session"}
                        </p>
                        <Button type="button" variant="outline" onClick={handleDisconnect}>
                            Disconnect
                        </Button>
                    </div>
                )}

                {!hasSavedCredentials && !isConnected && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="docusign-integration-key">Integration key</Label>
                            <Input
                                id="docusign-integration-key"
                                value={integrationKey}
                                onChange={(e) => setIntegrationKey(e.target.value)}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="docusign-user-id">User ID (API username — the user to impersonate)</Label>
                            <Input
                                id="docusign-user-id"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                The GUID shown as &ldquo;API Username&rdquo; on the DocuSign Apps and Keys page — not an email address.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="docusign-private-key">RSA private key (PEM)</Label>
                            <textarea
                                id="docusign-private-key"
                                value={privateKey}
                                onChange={(e) => setPrivateKey(e.target.value)}
                                placeholder={"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"}
                                rows={6}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                Paste the full PEM downloaded when the RSA keypair was added to the app. It is
                                stored encrypted and never shown again.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={handleConnect}
                            disabled={!integrationKey.trim() || !userId.trim() || !privateKey.trim() || auth.status === "authenticating"}
                        >
                            {auth.status === "authenticating" ? "Verifying…" : "Verify & connect"}
                        </Button>
                        {auth.status === "error" && auth.error && (
                            <p role="alert" className="text-sm text-destructive">{auth.error}</p>
                        )}
                    </div>
                )}
            </div>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Set up DocuSign (org-side — Applico can&apos;t do this for you)</h2>
                <p className="text-sm text-muted-foreground">
                    In the DocuSign dashboard (demo: <code className="font-mono text-xs">account-d.docusign.com</code>; production: <code className="font-mono text-xs">account.docusign.com</code>):
                </p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Create the app: Settings → Integrations → Apps and Keys → Add App &amp; Integration Key. Copy the integration key and the API Username (user ID) above.</li>
                    <li>On the same app, under Authentication, add an RSA keypair and download the private key (shown once). Paste it above.</li>
                    <li>Grant consent once: the impersonated user must grant this integration key the <code className="font-mono text-xs">signature impersonation</code> scope — an org admin can grant admin consent in DocuSign Admin, or the user can open the individual consent URL (replace the redirect URI with one registered on the app; the code it returns is not needed — consent is the side effect):
                        <code className="font-mono text-xs break-all block mt-1">{consentUrl}</code>
                    </li>
                    <li>Create the offer-letter template in DocuSign (Templates → New): the offer-letter document, signature/initial tabs, and a signer role — the role name below must match the template&apos;s role exactly.</li>
                    <li>For production only: pass DocuSign&apos;s Go Live review with this integration key (20+ successful demo API calls) before production sends will work.</li>
                </ol>
            </div>

            {(hasSavedCredentials || isConnected) && (
                <div className="rounded-md border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Offer-letter template</h2>
                    <p className="text-sm text-muted-foreground">
                        The template sent with every offer letter. Templates are account-specific —
                        load the real list from DocuSign rather than guessing an ID.
                    </p>
                    {templatesLoading && (
                        <p className="text-sm text-muted-foreground">Loading templates…</p>
                    )}
                    {templatesError && (
                        <p role="alert" className="text-sm text-destructive">{templatesError}</p>
                    )}
                    {!templatesLoading && !templatesError && templates.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No templates found for this DocuSign account. Create an offer-letter template
                            in the DocuSign dashboard first, then reload.
                        </p>
                    )}
                    {templates.length > 0 && (
                        <div className="space-y-2">
                            {templates.map((tpl) => (
                                <label key={tpl.templateId} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="docusign-template"
                                        checked={templateId === tpl.templateId}
                                        onChange={() => setTemplateId(tpl.templateId)}
                                    />
                                    <span className="font-semibold">{tpl.name}</span>
                                    <code className="font-mono text-xs text-muted-foreground">{tpl.templateId}</code>
                                </label>
                            ))}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="docusign-template-id">Or enter a template ID manually</Label>
                        <Input
                            id="docusign-template-id"
                            value={templateId}
                            onChange={(e) => setTemplateId(e.target.value)}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            className="font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="docusign-role-name">Signer role name (as defined on the template)</Label>
                        <Input
                            id="docusign-role-name"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            placeholder="Candidate"
                        />
                        <p className="text-xs text-muted-foreground">
                            The candidate is bound to this role when the envelope is created. It must match
                            the template&apos;s role name exactly, or DocuSign rejects the envelope.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="docusign-email-subject">Email subject (optional)</Label>
                        <Input
                            id="docusign-email-subject"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            placeholder="Please sign: your offer letter"
                        />
                        <p className="text-xs text-muted-foreground">
                            Left blank, the subject defaults to &ldquo;Please sign: your offer letter for [job title]&rdquo;.
                        </p>
                    </div>
                    {templateError && (
                        <p role="alert" className="text-sm text-destructive">{templateError}</p>
                    )}
                    {templateSaved && (
                        <p role="status" className="text-sm text-emerald-600">✓ Template saved</p>
                    )}
                    <div className="flex gap-2">
                        <Button type="button" onClick={handleSaveTemplate}>
                            Save template
                        </Button>
                        <Button type="button" variant="outline" onClick={loadTemplates} disabled={templatesLoading}>
                            {templatesLoading ? "Loading…" : "Reload templates from DocuSign"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocuSignConfig;
