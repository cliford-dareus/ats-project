'use client';

// Job board syndication panel — one card per board, on the job's Options tab.
// Loads state from get_job_syndication_action (job:view) and mutates
// through set_job_syndication_action / mark_linkedin_posted_action
// (job:edit, enforced server-side — a denied call surfaces its message
// here instead of silently failing). Boards whose plugin is not enabled
// for the org render disabled with a link to Settings; they cannot be
// published from here.
//
// Indeed: Publish/Unpublish. Publishing only records intent — the job
// joins the public XML feed, which Indeed crawls. The omission reasons
// (same check the feed uses, computed server-side) explain why a
// published job still isn't in the feed.
// LinkedIn: posting is MANUAL. "Copy posting draft" copies a draft built
// from the job's real fields; the recruiter posts it themselves, then
// "Mark as posted" with the real post URL. Nothing here ever claims a
// LinkedIn post that did not happen.

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { copyTextToClipboard } from "@/lib/job-display";
import {
    get_job_syndication_action,
    get_linkedin_posting_draft_action,
    mark_linkedin_posted_action,
    set_job_syndication_action,
} from "@/server/actions/syndication-actions";
import type { SyndicationBoardId, SyndicationBoardState } from "@/types";

type BoardStateMap = Record<SyndicationBoardId, SyndicationBoardState>;

const BOARD_LABELS: Record<SyndicationBoardId, string> = {
    indeed: "Indeed",
    linkedin: "LinkedIn",
};

const STATUS_LABELS: Record<SyndicationBoardState["status"], string> = {
    not_syndicated: "Not published",
    syndicated: "Published",
    failed: "Failed",
    posted: "Posted",
};

const JobSyndicationPanel = ({ jobId }: { jobId: number }) => {
    const [boards, setBoards] = useState<BoardStateMap | null>(null);
    const [indeedOmissionReasons, setIndeedOmissionReasons] = useState<string[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busy, setBusy] = useState<SyndicationBoardId | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [noticeIsError, setNoticeIsError] = useState(false);

    // LinkedIn draft + mark-as-posted state.
    const [draft, setDraft] = useState<string | null>(null);
    const [draftState, setDraftState] = useState<"idle" | "loading" | "copied" | "failed">("idle");
    const [postUrl, setPostUrl] = useState("");
    const [markState, setMarkState] = useState<"idle" | "saving">("idle");

    const refresh = useCallback(async () => {
        try {
            const result = await get_job_syndication_action(jobId);
            const map = Object.fromEntries(
                result.boards.map((b) => [b.boardId, b]),
            ) as BoardStateMap;
            setBoards(map);
            setIndeedOmissionReasons(result.indeedOmissionReasons);
            setLoadError(null);
        } catch (err) {
            setLoadError((err as Error).message || "Failed to load syndication status");
        }
    }, [jobId]);

    useEffect(() => {
        let cancelled = false;
        refresh().catch(() => {
            if (!cancelled) setLoadError("Failed to load syndication status");
        });
        return () => {
            cancelled = true;
        };
    }, [refresh]);

    const handleIndeedToggle = async (board: SyndicationBoardState) => {
        setBusy("indeed");
        setNotice(null);
        try {
            const result = await set_job_syndication_action(
                jobId,
                "indeed",
                board.status === "syndicated" ? "unpublish" : "publish",
            );
            if (!result.success) {
                setNotice(result.message ?? "Could not update Indeed status");
                setNoticeIsError(true);
                return;
            }
            setNotice(result.message ?? null);
            setNoticeIsError(false);
            await refresh();
        } catch (err) {
            setNotice((err as Error).message || "Could not update Indeed status");
            setNoticeIsError(true);
        } finally {
            setBusy(null);
        }
    };

    const handleCopyDraft = async () => {
        setDraftState("loading");
        setNotice(null);
        try {
            const result = await get_linkedin_posting_draft_action(jobId);
            if (!result.success || !result.draft) {
                setNotice(result.message ?? "Could not build the posting draft");
                setNoticeIsError(true);
                setDraftState("failed");
                return;
            }
            setDraft(result.draft);
            const ok = await copyTextToClipboard(result.draft);
            setDraftState(ok ? "copied" : "failed");
            if (!ok) {
                setNotice("Draft loaded below — copying failed, select and copy it manually.");
                setNoticeIsError(true);
            }
        } catch (err) {
            setNotice((err as Error).message || "Could not build the posting draft");
            setNoticeIsError(true);
            setDraftState("failed");
        }
    };

    const handleMarkPosted = async () => {
        setMarkState("saving");
        setNotice(null);
        try {
            const result = await mark_linkedin_posted_action(jobId, postUrl);
            if (!result.success) {
                setNotice(result.message ?? "Could not mark as posted");
                setNoticeIsError(true);
                return;
            }
            setNotice(result.message ?? null);
            setNoticeIsError(false);
            setPostUrl("");
            await refresh();
        } catch (err) {
            setNotice((err as Error).message || "Could not mark as posted");
            setNoticeIsError(true);
        } finally {
            setMarkState("idle");
        }
    };

    const indeed = boards?.indeed;
    const linkedin = boards?.linkedin;

    return (
        <div>
            <div className="mb-2">
                <h2>Job board syndication</h2>
                <p className="text-muted-foreground text-sm">Publish this job to external job boards</p>
            </div>

            {loadError && (
                <p role="alert" className="text-sm text-destructive mb-2">{loadError}</p>
            )}
            {notice && (
                <p role={noticeIsError ? "alert" : "status"} className={`text-sm mb-2 ${noticeIsError ? "text-destructive" : "text-emerald-600"}`}>
                    {notice}
                </p>
            )}

            {!boards && !loadError && (
                <p className="text-sm text-muted-foreground">Loading syndication status…</p>
            )}

            {boards && (
                <div className="flex flex-col gap-3">
                    {/* ── Indeed ─────────────────────────────────────────── */}
                    <div className="border rounded p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{BOARD_LABELS.indeed}</span>
                            <Badge variant="outline">{STATUS_LABELS[indeed!.status]}</Badge>
                        </div>
                        {!indeed!.enabled ? (
                            <p className="text-sm text-muted-foreground">
                                Indeed is not enabled for this organization.{" "}
                                <Link href="/settings/indeed" className="text-blue-500 underline">
                                    Enable it in Settings
                                </Link>{" "}
                                to publish this job.
                            </p>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    {indeed!.status === "syndicated"
                                        ? "This job is in your public Indeed XML feed."
                                        : "Publishing adds this job to your public Indeed XML feed, which Indeed crawls."}
                                </p>
                                {indeed!.status === "syndicated" && indeedOmissionReasons.length > 0 && (
                                    <p role="alert" className="text-sm text-destructive">
                                        Not in the feed yet: {indeedOmissionReasons.join("; ")}.
                                    </p>
                                )}
                                <div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={busy === "indeed"}
                                        onClick={() => handleIndeedToggle(indeed!)}
                                    >
                                        {busy === "indeed"
                                            ? "Saving…"
                                            : indeed!.status === "syndicated"
                                                ? "Unpublish from Indeed"
                                                : "Publish to Indeed"}
                                    </Button>
                                </div>
                            </>
                        )}
                        {indeed!.errorMessage && (
                            <p className="text-sm text-destructive">{indeed!.errorMessage}</p>
                        )}
                    </div>

                    {/* ── LinkedIn ───────────────────────────────────────── */}
                    <div className="border rounded p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{BOARD_LABELS.linkedin}</span>
                            <Badge variant="outline">{STATUS_LABELS[linkedin!.status]}</Badge>
                        </div>
                        {!linkedin!.enabled ? (
                            <p className="text-sm text-muted-foreground">
                                LinkedIn is not enabled for this organization.{" "}
                                <Link href="/settings/linkedin" className="text-blue-500 underline">
                                    Enable it in Settings
                                </Link>{" "}
                                to track manual LinkedIn posts for this job.
                            </p>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    LinkedIn posting is manual — copy the draft, post it on LinkedIn yourself, then
                                    mark it posted with the post URL.
                                </p>
                                {linkedin!.externalUrl && (
                                    <p className="text-sm">
                                        <a
                                            href={linkedin!.externalUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-500 underline break-all"
                                        >
                                            View post on LinkedIn
                                        </a>
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={draftState === "loading"}
                                        onClick={handleCopyDraft}
                                    >
                                        {draftState === "loading"
                                            ? "Loading…"
                                            : draftState === "copied"
                                                ? "Draft copied!"
                                                : draftState === "failed"
                                                    ? "Copy failed — try again"
                                                    : "Copy posting draft"}
                                    </Button>
                                </div>
                                {draft !== null && (
                                    <textarea
                                        readOnly
                                        value={draft}
                                        rows={8}
                                        className="w-full rounded border p-2 text-xs font-mono bg-muted/50"
                                    />
                                )}
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="url"
                                        value={postUrl}
                                        onChange={(e) => setPostUrl(e.target.value)}
                                        placeholder="https://www.linkedin.com/posts/…"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={markState === "saving" || postUrl.trim() === ""}
                                        onClick={handleMarkPosted}
                                    >
                                        {markState === "saving" ? "Saving…" : "Mark as posted"}
                                    </Button>
                                </div>
                            </>
                        )}
                        {linkedin!.errorMessage && (
                            <p className="text-sm text-destructive">{linkedin!.errorMessage}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobSyndicationPanel;
