import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { LINKEDIN_BRAND_COLOR, validateLinkedInPageUrl } from "@/plugins/providers/linkedin";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfigProps } from "./shared/types";
import Link from "next/link";

// LinkedIn config — manual posting only.
//
// Honest states (there is no API to verify against, so there is no
// "Connected · API verified" state anywhere here):
//   • "Configured" — a valid LinkedIn Page URL is saved in config.
//   • "Not configured" — no Page URL saved yet.
// No LinkedIn credential is stored: LinkedIn has no free job-posting
// API, so no key/secret would do anything. When/if a Talent Solutions
// integration exists, its credential gets its own field + server-side
// verify step — do not add a free-text "API key" field here.

const LinkedInConfig = ({ pluginId, settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState(pluginId);

    const savedPageUrl =
        typeof settings?.config?.pageUrl === "string" ? settings.config.pageUrl : "";
    const savedValid = savedPageUrl !== "" && validateLinkedInPageUrl(savedPageUrl) === null;
    const isConfigured = auth.status === "authenticated" || savedValid;

    // pageUrl is the edit buffer for the (public, non-secret) Page URL.
    // It syncs from saved settings after a save, like ApiKeySection does
    // for its local key state.
    const [pageUrl, setPageUrl] = useState(savedPageUrl);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);

    useEffect(() => {
        setPageUrl(savedPageUrl);
    }, [savedPageUrl]);

    // ── Dirty tracking ────────────────────────────────────────────────────
    // Save is enabled whenever the typed URL differs from the saved one.
    const isDirty = useMemo(
        () => pageUrl.trim() !== savedPageUrl.trim(),
        [pageUrl, savedPageUrl],
    );

    useEffect(() => {
        if (!isDirty) return;
        const guard = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener("beforeunload", guard);
        return () => window.removeEventListener("beforeunload", guard);
    }, [isDirty]);

    const displayAuth =
        configError || auth.status === "error"
            ? { status: "error" as const, error: configError ?? auth.error }
            : auth;

    const handleSave = async () => {
        const nextUrl = pageUrl.trim();
        // Clearing the field removes the Page URL (disconnects).
        const problem = nextUrl === "" ? null : validateLinkedInPageUrl(nextUrl);
        if (problem) {
            setConfigError(problem);
            return;
        }
        setSaving(true);
        setConfigError(null);
        try {
            // Page URL is public config, not a credential: it is stored
            // unencrypted in settings.config (no secret to protect) and
            // returned to the browser as-is. Nothing here goes through
            // the encrypted plugin-key path — there is no key.
            await onSave({
                ...settings,
                active: nextUrl !== "",
                config: { ...(settings.config ?? {}), pageUrl: nextUrl },
            });
            if (nextUrl !== "") {
                await authenticate(pluginId, { pageUrl: nextUrl });
            } else {
                await pluginRegistry.getProvider(pluginId)?.deauthenticate();
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            setConfigError((e as Error).message || "Failed to save LinkedIn settings");
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async () => {
        setConfigError(null);
        try {
            // Clear server-side FIRST; only drop the local auth state on
            // success, so a failed clear doesn't leave the UI claiming
            // "Not configured" while the server still holds the URL.
            await onSave({
                ...settings,
                active: false,
                config: { ...(settings.config ?? {}), pageUrl: "" },
            });
            setPageUrl("");
            await pluginRegistry.getProvider(pluginId)?.deauthenticate();
        } catch (e) {
            setConfigError((e as Error).message || "Failed to disconnect LinkedIn");
        }
    };

    return (
        <div className="relative">
            {/* Top bar — same shape as GoogleConfig's */}
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full"
                        style={{ backgroundColor: LINKEDIN_BRAND_COLOR }}
                    >
                        <span className="text-white text-sm font-black">in</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">LinkedIn</div>
                        <div className="text-xs text-background/20">
                            Manual job posting
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                {/* Status pill — "Configured", never "Connected · API verified":
                    there is no API to verify. */}
                <div
                    className="flex items-center gap-6 py-1 px-3 rounded-md text-sm"
                    style={{
                        background: isConfigured ? "#0d1a14" : "#111",
                        border: `1px solid ${isConfigured ? "#10b981" : "#1f1f1f"}`,
                        color: isConfigured ? "#10b981" : "#4b5563",
                    }}>
                    <div className="w-5 h-5 rounded-full bg-card shadow-[0_0_4px_#10b981] dark:bg-card dark:shadow-[0_0_4px_#374151]">
                        <div className="w-5 h-5 rounded-full" style={{ background: isConfigured ? "#10b981" : "#374151" }} />
                    </div>
                    {isConfigured ? "Configured" : "Not configured"}
                </div>

                {isDirty && !saving && (
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "#f59e0b" }}>
                        ● Unsaved changes
                    </span>
                )}

                <Button
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className="rounded-md"
                    style={{
                        padding: "7px 18px", borderRadius: 6,
                        background: saved ? "#0d1a14" : (isDirty ? "#fff" : "#111"),
                        border: saved ? "1px solid #10b981" : "none",
                        color: saved ? "#10b981" : (isDirty ? "#000" : "#374151"),
                        fontSize: 12, fontWeight: 600,
                        cursor: isDirty ? "pointer" : "not-allowed",
                        fontFamily: "'Geist Mono', monospace",
                        transition: "all 0.2s",
                    }}
                >
                    {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
                </Button>
            </div>

            <div className="space-y-6 border rounded-md p-4">
                <div>
                    <div className="mb-6">
                        <h1 className="text-[20px] font-semibold tracking-tight">
                            LinkedIn Settings
                        </h1>
                        <p className="mt-1 text-[13px] text-muted-foreground leading-tight">
                            Post open roles to your LinkedIn Page by hand — Applico prepares the post, you publish it.
                        </p>
                    </div>

                    {displayAuth.status === "error" && displayAuth.error && (
                        <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-3">
                            ⚠ {displayAuth.error}
                        </div>
                    )}

                    {/* ── How manual posting works ─────────────────────────── */}
                    <section className="bg-card overflow-hidden rounded-md mb-3 border">
                        <div className="p-4 border-b bg-transparent">
                            <div className="text-[13px] uppercase tracking-wide font-bold">
                                How LinkedIn posting works
                            </div>
                            <div className="text-[11px] mt-0.5">
                                LinkedIn has no free job-posting API — posting a job requires a Talent Solutions
                                partnership, which Applico does not have. Nothing is posted automatically.
                            </div>
                        </div>
                        <div className="px-4 py-4 text-[13px] leading-relaxed text-muted-foreground space-y-2">
                            <p>
                                1. Open a job and copy the prepared LinkedIn post from its detail panel.
                            </p>
                            <p>
                                2. Publish it yourself on your LinkedIn Page.
                            </p>
                            <p>
                                3. Paste the real post URL back on the job — only then is the job shown as
                                posted to LinkedIn, with that URL. A job is never shown as posted without one.
                            </p>
                            <p>
                                No LinkedIn credential is stored here: there is no API to call, so no key
                                or secret would do anything.
                            </p>
                        </div>
                        <div className="px-4 pb-4">
                            <Link
                                href="/jobs"
                                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white"
                                style={{ backgroundColor: LINKEDIN_BRAND_COLOR }}
                            >
                                Open your jobs to prepare a post →
                            </Link>
                        </div>
                    </section>

                    {/* ── LinkedIn Page URL ──────────────────────────────── */}
                    <section className="bg-card overflow-hidden rounded-md mb-3 border">
                        <div className="p-4 border-b bg-transparent">
                            <div className="text-[13px] uppercase tracking-wide font-bold">
                                LinkedIn Page
                            </div>
                            <div className="text-[11px] mt-0.5">
                                Your company&apos;s public LinkedIn Page — used in the posting draft so the post names the right Page.
                                This URL is public, not a secret, and is stored as plain config.
                            </div>
                        </div>
                        <div className="my-5 px-4">
                            <label style={{
                                display: "block", fontSize: 11, fontWeight: 600,
                                color: "#6b7280",
                                fontFamily: "'Geist Mono', monospace",
                                letterSpacing: "0.08em", textTransform: "uppercase",
                                marginBottom: 6,
                            }}>
                                LinkedIn Page URL
                            </label>
                            <Input
                                type="url"
                                value={pageUrl}
                                onChange={(v) => setPageUrl(v.target.value)}
                                placeholder="https://www.linkedin.com/company/acme"
                            />
                            {savedValid && !isDirty && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Saved Page:{" "}
                                    <a
                                        href={savedPageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline"
                                    >
                                        {savedPageUrl}
                                    </a>
                                </p>
                            )}
                            {savedValid && (
                                <div className="mt-4">
                                    <Button variant="outline" onClick={handleDisconnect}>
                                        Remove Page URL
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default LinkedInConfig;
