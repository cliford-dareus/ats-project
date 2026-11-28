'use client';

// Sterling config — Client ID + Client Secret (OAuth2 client
// credentials), environment (test/Integration vs live/production),
// package, invite workflow.
//
// Honest states (same masked-key rule as Google/Resend/Calendly):
//   • "Connected · Sterling API verified this session" — this session's
//     credentials were just verified against POST /oauth + GET /packages
//     on the selected environment's host.
//   • "Saved · credentials stored, not verified this session" — masked
//     values are stored; nothing was verified this session.
//   • "Not connected" — no credentials stored.
//
// Environment is load-bearing, not a label:
//   • Test = api.us.int.sterlingcheck.app — Integration environment,
//     Developer Portal test account, no real checks, no charges.
//   • Live = api.us.sterlingcheck.app — real checks, billable. The
//     account must be set up with Sterling first (packages configured,
//     credentialing completed — your Sterling account manager provisions
//     the Client ID / Client Secret).
// Test and production use SEPARATE credential sets, so switching
// environments requires disconnecting and entering the other set — the
// selector is locked while credentials are saved, rather than silently
// reusing test credentials against the live host (or vice versa).
// US only in this build: EMEA, Canada and APAC are production-only and
// need region-specific credentials (api.eu. / api.ca. / api.au. hosts).
// An org screening outside the US needs those credentials provisioned
// by Sterling first — that is a follow-up, not a silent fallback.
//
// What Sterling does here (stated in the UI, not just in code):
//   • Initiation is a manual recruiter action on the application page,
//     gated on the Offer stage + an explicit FCRA consent confirmation.
//     Nothing auto-fires a check.
//   • The invite flow is the only ordering path: Applico creates a
//     Sterling candidate (name + email only — SSN/DOB/address are never
//     sent) and creates a screening with the package below. Sterling
//     then emails the candidate the Candidate Hub link ("email") or
//     returns the form URL ("link"), where the candidate confirms their
//     info and provides consent; the screening runs when they complete it.
//   • Package ids are account-specific and must exist in the Sterling
//     dashboard first — an unknown id fails with Sterling's real error.
//     Load the real list below instead of guessing an id.
//   • Status is refreshed on demand from the application card. There is
//     no live polling and no callback receiver in this build.
//   • There is no cancel action: Sterling documents no DELETE
//     /screenings endpoint — cancellation happens in the Sterling portal.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { STERLING_BRAND_COLOR } from "@/plugins/providers/sterling";
import { verifySterling, list_sterling_packages_action } from "@/server/actions/sterling-actions";
import type { SterlingEnvironment, SterlingInviteMethod } from "@/types";
import { ConfigProps } from "./shared/types";

type PackageOption = { id: string; name: string };

const SterlingConfig = ({ pluginId, settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState(pluginId);

    const maskedClientId =
        typeof settings?.credentials?.clientId === "string"
            ? settings.credentials.clientId
            : "";
    const maskedClientSecret =
        typeof settings?.credentials?.clientSecret === "string"
            ? settings.credentials.clientSecret
            : "";
    const hasSavedCredentials = !!maskedClientId && !!maskedClientSecret;
    const isConnected = auth.status === "authenticated";
    const savedEnvironment = (
        settings?.config?.environment === "live" ? "live" : "test"
    ) as SterlingEnvironment;
    const savedPackage =
        typeof settings?.config?.package === "string" ? settings.config.package : "";
    const savedInviteMethod = (
        settings?.config?.inviteMethod === "link" ? "link" : "email"
    ) as SterlingInviteMethod;

    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [showSecret, setShowSecret] = useState(false);
    const [environment, setEnvironment] = useState<SterlingEnvironment>(savedEnvironment);
    const [connectError, setConnectError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [reentering, setReentering] = useState(false);

    const [packages, setPackages] = useState<PackageOption[]>([]);
    const [packagesError, setPackagesError] = useState<string | null>(null);
    const [packagesLoading, setPackagesLoading] = useState(false);
    const [packageId, setPackageId] = useState(savedPackage);
    const [packageSaved, setPackageSaved] = useState(false);
    const [packageError, setPackageError] = useState<string | null>(null);

    const [inviteMethod, setInviteMethod] = useState<SterlingInviteMethod>(savedInviteMethod);
    const [inviteSaved, setInviteSaved] = useState(false);

    const loadPackages = async () => {
        setPackagesLoading(true);
        setPackagesError(null);
        try {
            const result = await list_sterling_packages_action();
            if (result.success) setPackages(result.packages ?? []);
            else setPackagesError(result.message);
        } catch (err) {
            setPackagesError((err as Error).message || "Failed to load packages");
        } finally {
            setPackagesLoading(false);
        }
    };

    // Stored credentials mean the org is connected even before this
    // session verifies them — load the live package list so the page
    // shows what Sterling can actually run.
    useEffect(() => {
        if (!hasSavedCredentials && !isConnected) return;
        loadPackages();
    }, [hasSavedCredentials, isConnected]);

    useEffect(() => {
        setPackageId(savedPackage);
    }, [savedPackage]);

    useEffect(() => {
        setInviteMethod(savedInviteMethod);
    }, [savedInviteMethod]);

    const handleConnect = async () => {
        const idToUse = clientId.trim();
        const secretToUse = clientSecret.trim();
        if (!idToUse || !secretToUse) return;
        setConnectError(null);
        try {
            // 1. Verify ONLY — POST /oauth, then GET /packages on the
            // selected environment's host. No badge change yet.
            const check = await verifySterling(idToUse, secretToUse, environment);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never
            // claimed "Connected" for credentials that aren't stored.
            await onSave({
                ...settings,
                active: true,
                credentials: { clientId: idToUse, clientSecret: secretToUse },
                config: {
                    ...(settings.config ?? {}),
                    environment,
                    package: packageId || check.packages?.[0]?.id || "",
                    inviteMethod,
                },
            });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies and keeps only masked values client-side.
            await authenticate(pluginId, { clientId: idToUse, clientSecret: secretToUse, environment });
            setClientId("");
            setClientSecret("");
            setReentering(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            if (check.packages) setPackages(check.packages);
            else loadPackages();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect Sterling");
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
                    environment: "test",
                    package: "",
                    inviteMethod: "email",
                },
            });
            setClientId("");
            setClientSecret("");
            setEnvironment("test");
            setPackages([]);
            setPackageId("");
            setInviteMethod("email");
            await pluginRegistry.getProvider(pluginId)?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect Sterling");
        }
    };

    const handleSavePackage = async () => {
        const id = packageId.trim();
        if (!id) {
            setPackageError("Enter a package id, or pick one from the list above.");
            return;
        }
        setPackageError(null);
        try {
            // Config-only save: the masked credentials echo preserves the
            // stored credentials server-side (see plugin-encryption).
            await onSave({
                ...settings,
                config: { ...(settings.config ?? {}), package: id },
            });
            setPackageSaved(true);
            setTimeout(() => setPackageSaved(false), 2500);
        } catch (e) {
            setPackageError((e as Error).message || "Failed to save package");
        }
    };

    const handleSaveInviteMethod = async () => {
        try {
            await onSave({
                ...settings,
                config: { ...(settings.config ?? {}), inviteMethod },
            });
            setInviteSaved(true);
            setTimeout(() => setInviteSaved(false), 2500);
        } catch (e) {
            setConnectError((e as Error).message || "Failed to save invite method");
        }
    };

    const showingStored = (isConnected || hasSavedCredentials) && !reentering;

    return (
        <div className="space-y-8">
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full"
                        style={{ backgroundColor: STERLING_BRAND_COLOR }}
                    >
                        <span className="text-white text-sm font-black">S</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">Sterling</div>
                        <div className="text-xs text-background/20">
                            Background checks · {savedEnvironment === "live" ? "LIVE" : "Test (Integration)"}
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
                <h2 className="text-lg font-semibold">What Sterling does here — and what it doesn&apos;t</h2>
                <p className="text-sm text-muted-foreground">
                    When Sterling is connected, a recruiter can initiate a background check from an
                    application in the Offer stage — a deliberate action, never automatic. Applico
                    creates a Sterling candidate and creates a screening with the package below;
                    Sterling invites the candidate to its Candidate Hub, where the candidate confirms
                    their information and provides consent. The screening runs when the candidate
                    completes the flow, and its status is refreshed on demand from the application page.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>No check ever starts on its own — initiation requires the Offer stage plus an explicit FCRA consent confirmation, recorded with who confirmed and when.</li>
                    <li>Applico never collects or sends a candidate&apos;s SSN, date of birth, or address. Sterling collects those in its Candidate Hub.</li>
                    <li>Applico does not store the signed authorization form — the org retains it. Adverse-action handling happens in the Sterling portal, not here.</li>
                    <li>No live polling and no callback receiver in this build — the application card shows when the status was last refreshed from Sterling.</li>
                    <li>No cancel action here — Sterling documents no screening-cancel endpoint. Cancel a screening in the Sterling portal.</li>
                </ul>
            </div>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Environment</h2>
                <p className="text-sm text-muted-foreground">
                    Test uses the US Integration host (<code className="font-mono text-xs">api.us.int.sterlingcheck.app</code>) — no real
                    checks run and nothing is billed. Live uses <code className="font-mono text-xs">api.us.sterlingcheck.app</code> — real
                    checks, billable. Test and production use separate credential sets, so switching
                    environments requires disconnecting and entering the other environment&apos;s credentials.
                </p>
                <div className="flex gap-2">
                    {(["test", "live"] as SterlingEnvironment[]).map((env) => (
                        <Button
                            key={env}
                            type="button"
                            variant={environment === env ? "default" : "outline"}
                            onClick={() => setEnvironment(env)}
                            disabled={hasSavedCredentials || isConnected}
                        >
                            {env === "test" ? "Test (Integration)" : "Live (production)"}
                        </Button>
                    ))}
                </div>
                {(hasSavedCredentials || isConnected) && (
                    <p className="text-sm text-amber-600">
                        Environment is locked while credentials are saved — disconnect to switch environments.
                        Currently configured: <span className="font-semibold">{savedEnvironment === "live" ? "Live (production)" : "Test (Integration)"}</span>.
                    </p>
                )}
                {environment === "live" && !hasSavedCredentials && (
                    <p className="text-sm text-amber-600">
                        Live runs real, billable background checks. Your Sterling account must be set up
                        first — packages configured and credentialing completed by Sterling — before going live.
                    </p>
                )}
                <p className="text-sm text-muted-foreground">
                    US only in this build. EMEA, Canada, and APAC are production-only and need
                    region-specific credentials from Sterling — ask your Sterling representative to
                    provision them; supporting another region is a follow-up.
                </p>
            </div>

            <section className="bg-card overflow-hidden rounded-md mb-3 border">
                <div className="p-4 border-b bg-transparent">
                    <div className="text-[13px] uppercase tracking-wide font-bold">
                        Authentication
                    </div>
                    <div className="text-[11px] mt-0.5">
                        Sterling uses OAuth2 client credentials — a Client ID and Client Secret, exchanged
                        server-side for a 1-hour token. Both are encrypted at rest (AES-256-GCM) and never
                        sent back to the browser — only the last 4 characters are shown.
                    </div>
                </div>

                <div className="my-5 px-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sterling-client-id">Client ID</Label>
                        <Input
                            id="sterling-client-id"
                            type="text"
                            value={showingStored ? maskedClientId : clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="e.g. your Sterling client ID"
                            disabled={showingStored}
                            className="font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sterling-client-secret">Client Secret</Label>
                        <div className="flex gap-2">
                            <Input
                                id="sterling-client-secret"
                                type={showSecret ? "text" : "password"}
                                value={showingStored ? maskedClientSecret : clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                placeholder="Your Sterling client secret"
                                disabled={showingStored}
                                className="font-mono flex-1"
                            />
                            {!showingStored && (
                                <Button type="button" variant="outline" onClick={() => setShowSecret((s) => !s)}>
                                    {showSecret ? "Hide" : "Show"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {showingStored ? (
                        <div className="flex gap-2">
                            <Button type="button" onClick={handleDisconnect}>
                                Disconnect
                            </Button>
                            <Button type="button" variant="outline" onClick={() => { setClientId(""); setClientSecret(""); setReentering(true); }}>
                                Re-enter different credentials
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2 items-center">
                            <Button
                                type="button"
                                onClick={handleConnect}
                                disabled={!clientId.trim() || !clientSecret.trim() || auth.status === "authenticating"}
                            >
                                {auth.status === "authenticating" ? "Verifying…" : "Connect"}
                            </Button>
                            {reentering && (
                                <Button type="button" variant="outline" onClick={() => setReentering(false)}>
                                    Cancel — keep the saved credentials
                                </Button>
                            )}
                        </div>
                    )}
                    {auth.status === "error" && auth.error && (
                        <p role="alert" className="text-sm text-destructive">⚠ {auth.error}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        {isConnected
                            ? "Connected · Sterling credentials verified this session"
                            : hasSavedCredentials
                              ? "Saved · credentials stored, not verified this session"
                              : "Not connected"}
                    </p>
                </div>
            </section>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Get Sterling credentials</h2>
                <p className="text-sm text-muted-foreground">
                    Credentials are provisioned by Sterling (now a First Advantage company) — request a
                    Client ID and Client Secret from your Sterling account manager for your screening
                    region. Test (Integration) and production credentials are different sets; the
                    Developer Portal at developer.sterlingcheck.app uses the test set. API reference:
                    apidocs.sterlingcheck.app.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Packages are configured in the Sterling dashboard — create the package there first, then pick it below. An unknown package id fails with Sterling&apos;s real error.</li>
                    <li>Your Sterling account must be set up (packages + credentialing) before live screenings can run — confirm with your account manager before switching to Live.</li>
                    <li>Sterling may require additional candidate fields depending on the package — those are collected by Sterling in the Candidate Hub, not by Applico.</li>
                </ul>
            </div>

            {(hasSavedCredentials || isConnected) && (
                <div className="rounded-md border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Screening package</h2>
                    <p className="text-sm text-muted-foreground">
                        The package id sent with every screening. Packages are account-specific —
                        load the real list from Sterling rather than guessing an id.
                    </p>
                    {packagesLoading && (
                        <p className="text-sm text-muted-foreground">Loading packages…</p>
                    )}
                    {packagesError && (
                        <p role="alert" className="text-sm text-destructive">{packagesError}</p>
                    )}
                    {!packagesLoading && !packagesError && packages.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No packages found for this Sterling account. Create a package in the Sterling
                            dashboard first, then reload.
                        </p>
                    )}
                    {packages.length > 0 && (
                        <div className="space-y-2">
                            {packages.map((pkg) => (
                                <label key={pkg.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="sterling-package"
                                        checked={packageId === pkg.id}
                                        onChange={() => setPackageId(pkg.id)}
                                    />
                                    <span className="font-semibold">{pkg.name}</span>
                                    <code className="font-mono text-xs text-muted-foreground">{pkg.id}</code>
                                </label>
                            ))}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="sterling-package-id">Or enter a package id manually</Label>
                        <div className="flex gap-2">
                            <Input
                                id="sterling-package-id"
                                value={packageId}
                                onChange={(e) => setPackageId(e.target.value)}
                                placeholder="e.g. 85685"
                                className="font-mono"
                            />
                            <Button type="button" onClick={handleSavePackage}>
                                Save package
                            </Button>
                        </div>
                        {packageError && (
                            <p role="alert" className="text-sm text-destructive">{packageError}</p>
                        )}
                        {packageSaved && (
                            <p role="status" className="text-sm text-emerald-600">✓ Package saved</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={loadPackages} disabled={packagesLoading}>
                            {packagesLoading ? "Loading…" : "Reload packages from Sterling"}
                        </Button>
                    </div>
                </div>
            )}

            {(hasSavedCredentials || isConnected) && (
                <div className="rounded-md border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Candidate invite</h2>
                    <p className="text-sm text-muted-foreground">
                        How Sterling reaches the candidate. Email: Sterling emails the candidate the
                        Candidate Hub link. Link: Sterling returns the form URL in the screening
                        response, so the recruiter can share it (it is shown on the application card
                        when Sterling provides one).
                    </p>
                    <div className="flex gap-2">
                        {(["email", "link"] as SterlingInviteMethod[]).map((method) => (
                            <Button
                                key={method}
                                type="button"
                                variant={inviteMethod === method ? "default" : "outline"}
                                onClick={() => setInviteMethod(method)}
                            >
                                {method === "email" ? "Email invite" : "Invite link"}
                            </Button>
                        ))}
                        <Button type="button" variant="outline" onClick={handleSaveInviteMethod}>
                            Save invite method
                        </Button>
                    </div>
                    {inviteSaved && (
                        <p role="status" className="text-sm text-emerald-600">✓ Invite method saved</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SterlingConfig;
