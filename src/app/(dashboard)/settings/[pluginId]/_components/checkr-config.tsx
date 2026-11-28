'use client';

// Checkr config — API key, environment (test/staging vs live), package.
//
// Honest states (same masked-key rule as Google/Resend/Calendly):
//   • "Connected · Checkr API verified this session" — this session's
//     key was just verified against GET /packages on the selected
//     environment's host.
//   • "Saved · key stored, not verified this session" — a masked key
//     is stored; nothing was verified this session.
//   • "Not connected" — no key stored.
//
// Environment is load-bearing, not a label:
//   • Test = api.checkr-staging.com — staging account, no real checks,
//     no charges. A staging account only exists off an already
//     authenticated production account (request one in Checkr's Help
//     Center); its key only works against the staging host.
//   • Live = api.checkr.com — real checks, billable. The account must
//     be credentialed by Checkr AND explicitly enabled for Reports
//     (Checkr's docs: email clients@checkr.com before integrating).
// Staging and production use SEPARATE API keys, so switching
// environments requires disconnecting and entering the other key — the
// selector is locked while a key is saved, rather than silently
// reusing a test key against the live host (or vice versa).
//
// What Checkr does here (stated in the UI, not just in code):
//   • Initiation is a manual recruiter action on the application page,
//     gated on the Offer stage + an explicit FCRA consent confirmation.
//     Nothing auto-fires a check.
//   • The invitation flow is the only ordering path: Applico creates /
//     reuses a Checkr candidate (email + name + zipcode only — SSN/DOB
//     are never sent) and creates an invitation with the package below.
//     Checkr emails the candidate its hosted apply-flow link, where the
//     candidate confirms their info and provides consent; the report is
//     created when they complete it.
//   • Package slugs are account-specific and must exist in the Checkr
//     dashboard first — an unknown slug fails with Checkr's real 422.
//     Load the real list below instead of guessing a slug.
//   • Status is refreshed on demand from the application card. There is
//     no live polling and no webhook receiver in this build.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { CHECKR_BRAND_COLOR } from "@/plugins/providers/checkr";
import { verifyCheckr, list_checkr_packages_action } from "@/server/actions/checkr-actions";
import type { CheckrEnvironment } from "@/types";
import ApiKeySection from "./shared/api-key-section";
import { ConfigProps } from "./shared/types";

type PackageOption = { slug: string; name: string };

const CheckrConfig = ({ pluginId, settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState(pluginId);

    const maskedKey =
        typeof settings?.credentials?.apiKey === "string"
            ? settings.credentials.apiKey
            : "";
    const hasSavedKey = !!maskedKey;
    const isConnected = auth.status === "authenticated";
    const savedEnvironment = (
        settings?.config?.environment === "live" ? "live" : "test"
    ) as CheckrEnvironment;
    const savedPackage =
        typeof settings?.config?.package === "string" ? settings.config.package : "";

    const [apiKey, setApiKey] = useState("");
    const [environment, setEnvironment] = useState<CheckrEnvironment>(savedEnvironment);
    const [connectError, setConnectError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const [packages, setPackages] = useState<PackageOption[]>([]);
    const [packagesError, setPackagesError] = useState<string | null>(null);
    const [packagesLoading, setPackagesLoading] = useState(false);
    const [packageSlug, setPackageSlug] = useState(savedPackage);
    const [packageSaved, setPackageSaved] = useState(false);
    const [packageError, setPackageError] = useState<string | null>(null);

    const loadPackages = async () => {
        setPackagesLoading(true);
        setPackagesError(null);
        try {
            const result = await list_checkr_packages_action();
            if (result.success) setPackages(result.packages ?? []);
            else setPackagesError(result.message);
        } catch (err) {
            setPackagesError((err as Error).message || "Failed to load packages");
        } finally {
            setPackagesLoading(false);
        }
    };

    // A stored key means the org is connected even before this session
    // verifies it — load the live package list so the page shows what
    // Checkr can actually run.
    useEffect(() => {
        if (!hasSavedKey && !isConnected) return;
        loadPackages();
    }, [hasSavedKey, isConnected]);

    useEffect(() => {
        setPackageSlug(savedPackage);
    }, [savedPackage]);

    const handleConnect = async (key?: string) => {
        const keyToUse = (key ?? apiKey).trim();
        if (!keyToUse) return;
        setConnectError(null);
        try {
            // 1. Verify ONLY — GET /packages on the selected
            // environment's host. No badge change yet.
            const check = await verifyCheckr(keyToUse, environment);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never
            // claimed "Connected" for a key that isn't stored.
            await onSave({
                ...settings,
                active: true,
                credentials: { apiKey: keyToUse },
                config: {
                    ...(settings.config ?? {}),
                    environment,
                    package: packageSlug || check.packages?.[0]?.slug || "",
                },
            });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies and keeps only the masked key client-side.
            await authenticate(pluginId, { apiKey: keyToUse, environment });
            setApiKey("");
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            if (check.packages) setPackages(check.packages);
            else loadPackages();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect Checkr");
        }
    };

    const handleDisconnect = async () => {
        setConnectError(null);
        try {
            // Clear server-side FIRST; only drop the local auth state on
            // success, so a failed clear doesn't leave the UI claiming
            // "Not connected" while the server still holds the key.
            await onSave({
                ...settings,
                active: false,
                credentials: {},
                config: {
                    ...(settings.config ?? {}),
                    environment: "test",
                    package: "",
                },
            });
            setApiKey("");
            setEnvironment("test");
            setPackages([]);
            setPackageSlug("");
            await pluginRegistry.getProvider(pluginId)?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect Checkr");
        }
    };

    const handleSavePackage = async () => {
        const slug = packageSlug.trim();
        if (!slug) {
            setPackageError("Enter a package slug, or pick one from the list above.");
            return;
        }
        setPackageError(null);
        try {
            // Config-only save: the masked credentials echo preserves the
            // stored key server-side (see plugin-encryption).
            await onSave({
                ...settings,
                config: { ...(settings.config ?? {}), package: slug },
            });
            setPackageSaved(true);
            setTimeout(() => setPackageSaved(false), 2500);
        } catch (e) {
            setPackageError((e as Error).message || "Failed to save package");
        }
    };

    return (
        <div className="space-y-8">
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full"
                        style={{ backgroundColor: CHECKR_BRAND_COLOR }}
                    >
                        <span className="text-white text-sm font-black">C</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">Checkr</div>
                        <div className="text-xs text-background/20">
                            Background checks · {savedEnvironment === "live" ? "LIVE" : "Test (staging)"}
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                <div
                    className="flex items-center gap-6 py-1 px-3 rounded-md text-sm"
                    style={{
                        background: isConnected ? "#0d1a14" : hasSavedKey ? "#171207" : "#111",
                        border: `1px solid ${isConnected ? "#10b981" : hasSavedKey ? "#f59e0b" : "#1f1f1f"}`,
                        color: isConnected ? "#10b981" : hasSavedKey ? "#f59e0b" : "#4b5563",
                    }}>
                    <div className="w-5 h-5 rounded-full bg-card shadow-[0_0_4px_#10b981] dark:bg-card dark:shadow-[0_0_4px_#374151]">
                        <div className="w-5 h-5 rounded-full" style={{ background: isConnected ? "#10b981" : hasSavedKey ? "#f59e0b" : "#374151" }} />
                    </div>
                    {isConnected ? "Connected" : hasSavedKey ? "Saved" : "Not connected"}
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
                <h2 className="text-lg font-semibold">What Checkr does here — and what it doesn&apos;t</h2>
                <p className="text-sm text-muted-foreground">
                    When Checkr is connected, a recruiter can initiate a background check from an
                    application in the Offer stage — a deliberate action, never automatic. Applico
                    creates or reuses the Checkr candidate and creates an invitation with the package
                    below; Checkr emails the candidate a link to its hosted apply flow, where the
                    candidate confirms their information and provides consent. The report appears when
                    the candidate completes the flow, and its status is refreshed on demand from the
                    application page.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>No check ever starts on its own — initiation requires the Offer stage plus an explicit FCRA consent confirmation, recorded with who confirmed and when.</li>
                    <li>Applico never collects or sends a candidate&apos;s SSN or date of birth. Checkr collects those in its hosted flow.</li>
                    <li>Applico does not store the signed authorization form — the org retains it. Adverse-action handling happens in the Checkr dashboard, not here.</li>
                    <li>No live polling and no webhook receiver in this build — the application card shows when the status was last refreshed from Checkr.</li>
                </ul>
            </div>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Environment</h2>
                <p className="text-sm text-muted-foreground">
                    Test uses the staging host (<code className="font-mono text-xs">api.checkr-staging.com</code>) — no real
                    checks run and nothing is billed. Live uses <code className="font-mono text-xs">api.checkr.com</code> — real
                    checks, billable. Staging and production use separate API keys, so switching
                    environments requires disconnecting and entering the other environment&apos;s key.
                </p>
                <div className="flex gap-2">
                    {(["test", "live"] as CheckrEnvironment[]).map((env) => (
                        <Button
                            key={env}
                            type="button"
                            variant={environment === env ? "default" : "outline"}
                            onClick={() => setEnvironment(env)}
                            disabled={hasSavedKey || isConnected}
                        >
                            {env === "test" ? "Test (staging)" : "Live (production)"}
                        </Button>
                    ))}
                </div>
                {(hasSavedKey || isConnected) && (
                    <p className="text-sm text-amber-600">
                        Environment is locked while a key is saved — disconnect to switch environments.
                        Currently configured: <span className="font-semibold">{savedEnvironment === "live" ? "Live (production)" : "Test (staging)"}</span>.
                    </p>
                )}
                {environment === "live" && !hasSavedKey && (
                    <p className="text-sm text-amber-600">
                        Live runs real, billable background checks. Your Checkr account must be
                        credentialed and explicitly enabled for Reports — contact Checkr
                        (clients@checkr.com) before going live if you have not already.
                    </p>
                )}
            </div>

            <ApiKeySection
                apiKey={apiKey}
                maskedKey={maskedKey || undefined}
                onApiKeyChange={setApiKey}
                auth={auth}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                pluginId={pluginId}
            />

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Get a Checkr API key</h2>
                <p className="text-sm text-muted-foreground">
                    In the Checkr dashboard: Account Settings → Developer Settings → API keys → Create
                    Key → choose <strong className="text-foreground">Secret</strong>. Use the staging
                    dashboard for a test key and the production dashboard for a live key — they are
                    different keys for different hosts.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>A staging account is only created off an already-authenticated production account — request one through Checkr&apos;s Help Center.</li>
                    <li>Before going live, Checkr must credential the account and enable it for Reports — reach out to clients@checkr.com first.</li>
                    <li>Packages are configured in the Checkr dashboard — create the package there first, then pick it below. An unknown slug fails with Checkr&apos;s real error.</li>
                </ul>
            </div>

            {(hasSavedKey || isConnected) && (
                <div className="rounded-md border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Screening package</h2>
                    <p className="text-sm text-muted-foreground">
                        The package slug sent with every invitation. Packages are account-specific —
                        load the real list from Checkr rather than guessing a slug.
                    </p>
                    {packagesLoading && (
                        <p className="text-sm text-muted-foreground">Loading packages…</p>
                    )}
                    {packagesError && (
                        <p role="alert" className="text-sm text-destructive">{packagesError}</p>
                    )}
                    {!packagesLoading && !packagesError && packages.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No packages found for this Checkr account. Create a package in the Checkr
                            dashboard first, then reload.
                        </p>
                    )}
                    {packages.length > 0 && (
                        <div className="space-y-2">
                            {packages.map((pkg) => (
                                <label key={pkg.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="checkr-package"
                                        checked={packageSlug === pkg.slug}
                                        onChange={() => setPackageSlug(pkg.slug)}
                                    />
                                    <span className="font-semibold">{pkg.name}</span>
                                    <code className="font-mono text-xs text-muted-foreground">{pkg.slug}</code>
                                </label>
                            ))}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="checkr-package-slug">Or enter a package slug manually</Label>
                        <div className="flex gap-2">
                            <Input
                                id="checkr-package-slug"
                                value={packageSlug}
                                onChange={(e) => setPackageSlug(e.target.value)}
                                placeholder="e.g. tasker_standard"
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
                            {packagesLoading ? "Loading…" : "Reload packages from Checkr"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckrConfig;
