'use client';

// Indeed config — feed URL, submission instructions, feed contents, and
// the Indeed account email.
//
// There is nothing to "connect": Indeed syndication is feed-based, so
// this page has no API key field and no Connect button. The org copies
// its public feed URL and submits it to Indeed themselves (Indeed
// reviews feeds before listing them); Aplico never auto-submits anything.
// The <email> element Indeed requires for verification comes from the
// Indeed account email saved here — it is a plain config value, not a
// credential, and it is validated as an email by orgPluginSettingsSchema.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfigProps } from "./shared/types";
import {
    get_indeed_feed_status_action,
    type IndeedFeedStatusJob,
} from "@/server/actions/syndication-actions";
import { copyTextToClipboard } from "@/lib/job-display";

// Indeed's own XML feed guide — the submission steps live here and with
// the recruiter's Indeed account manager. Verified Nov 2026; there is no
// public "submit a feed URL" page to deep-link, so this page does not
// pretend there is one.
const INDEED_FEED_GUIDE_URL = "https://docs-plus.indeed.com/job-sync-xml/xml-feed";

type FeedStatus = Awaited<ReturnType<typeof get_indeed_feed_status_action>>;

const IndeedConfig = ({ settings, onSave }: ConfigProps) => {
    const [status, setStatus] = useState<FeedStatus | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

    // The Indeed account email is a plain config value (not a
    // credential): it is stored unencrypted in the plugin settings and
    // read back here for display.
    const savedEmail =
        typeof settings?.config?.indeedAccountEmail === "string"
            ? settings.config.indeedAccountEmail
            : "";
    const [email, setEmail] = useState(savedEmail);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        get_indeed_feed_status_action()
            .then((result) => {
                if (cancelled) return;
                if (result.success) setStatus(result);
                else setLoadError(result.message);
            })
            .catch((err: Error) => {
                if (!cancelled) setLoadError(err.message || "Failed to load feed status");
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const feedUrl = status && status.success ? status.feedUrl : null;

    const handleCopyFeedUrl = async () => {
        if (!feedUrl) return;
        const ok = await copyTextToClipboard(feedUrl);
        setCopyState(ok ? "copied" : "failed");
        window.setTimeout(() => setCopyState("idle"), 2500);
    };

    const handleSaveEmail = async () => {
        setSaving(true);
        setSaveError(null);
        setSaved(false);
        try {
            await onSave({
                ...settings,
                active: true,
                config: { ...settings.config, indeedAccountEmail: email.trim() },
            });
            setSaved(true);
        } catch (err) {
            setSaveError((err as Error).message || "Failed to save email");
        } finally {
            setSaving(false);
        }
    };

    const emailDirty = email.trim() !== savedEmail.trim();

    return (
        <div className="space-y-8">
            <div className="rounded-md border p-6 space-y-2">
                <h2 className="text-lg font-semibold">No API key needed</h2>
                <p className="text-sm text-muted-foreground">
                    Indeed reads your jobs from a public XML feed — there is nothing to connect and no key to paste.
                    Publish a job to Indeed from its job page and it appears in the feed below; Indeed crawls the
                    feed on its own schedule.
                </p>
            </div>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Your Indeed feed</h2>
                {loadError && (
                    <p role="alert" className="text-sm text-destructive">{loadError}</p>
                )}
                {!status && !loadError && (
                    <p className="text-sm text-muted-foreground">Loading feed status…</p>
                )}
                {feedUrl && (
                    <>
                        <div>
                            <Label>Feed URL</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Input type="text" readOnly value={feedUrl} className="font-mono text-xs" />
                                <Button type="button" variant="outline" onClick={handleCopyFeedUrl}>
                                    {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Copy failed" : "Copy"}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Anyone with this URL can read your open, Indeed-published jobs. Only jobs you publish
                                to Indeed appear here — unpublished jobs are never in the feed.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">How to submit it to Indeed</h3>
                            <ol className="text-sm text-muted-foreground mt-1 list-decimal list-inside space-y-1">
                                <li>Copy the feed URL above.</li>
                                <li>
                                    Give it to Indeed through your Indeed employer account — your account manager, or
                                    Indeed&apos;s feed review process. Indeed reviews feeds before listing them.
                                </li>
                                <li>
                                    Read Indeed&apos;s feed requirements first:{" "}
                                    <a
                                        href={INDEED_FEED_GUIDE_URL}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-500 underline"
                                    >
                                        Indeed XML feed guide
                                    </a>
                                    .
                                </li>
                            </ol>
                            <p className="text-sm text-muted-foreground mt-2">
                                There is no automatic submission from Aplico — Indeed decides whether to accept a feed.
                            </p>
                        </div>
                    </>
                )}
            </div>

            {status && status.success && (
                <div className="rounded-md border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">What&apos;s in the feed</h2>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{status.inFeedCount}</span>{" "}
                        open {status.inFeedCount === 1 ? "job" : "jobs"} in the feed
                        {" · "}
                        <span className="font-semibold text-foreground">{status.notPublishedCount}</span>{" "}
                        open {status.notPublishedCount === 1 ? "job" : "jobs"} not published to Indeed
                    </p>
                    {status.inFeedJobs.length > 0 && (
                        <ul className="text-sm space-y-1">
                            {status.inFeedJobs.map((job: IndeedFeedStatusJob) => (
                                <li key={job.id} className="flex items-center gap-2">
                                    <Badge variant="outline">In feed</Badge>
                                    <span>{job.title}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {status.omittedJobs.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold">Omitted from the feed</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                These jobs are published to Indeed but are missing a field Indeed requires, so the
                                feed leaves them out. Fix the field on the job and they appear automatically.
                            </p>
                            <ul className="text-sm space-y-2 mt-2">
                                {status.omittedJobs.map((job: IndeedFeedStatusJob) => (
                                    <li key={job.id}>
                                        <span className="font-medium">{job.title}</span>
                                        <span className="text-muted-foreground"> — {(job.reasons ?? []).join("; ")}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {status.omittedJobs.length === 0 && status.inFeedJobs.length === 0 && status.notPublishedCount === 0 && (
                        <p className="text-sm text-muted-foreground">No open jobs yet.</p>
                    )}
                </div>
            )}

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Indeed account email</h2>
                <p className="text-sm text-muted-foreground">
                    Indeed uses this address to verify the business that posts the jobs. It appears in the feed as
                    the <code className="font-mono text-xs">&lt;email&gt;</code> element. Without it, jobs are still
                    listed in the feed, but Indeed may not accept the feed for verification.
                </p>
                <div>
                    <Label>Your Indeed account email</Label>
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setSaved(false);
                        }}
                        placeholder="you@company.com"
                        className="mt-1"
                    />
                </div>
                {saveError && (
                    <p role="alert" className="text-sm text-destructive">{saveError}</p>
                )}
                {saved && (
                    <p role="status" className="text-sm text-emerald-600">Saved.</p>
                )}
                <Button type="button" onClick={handleSaveEmail} disabled={saving || !emailDirty}>
                    {saving ? "Saving…" : "Save email"}
                </Button>
            </div>
        </div>
    );
};

export default IndeedConfig;
