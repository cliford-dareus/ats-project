"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { usePluginSystem } from "@/providers/plugin-system-provider";
import { useHasPermission } from "@/lib/use-permission";
import {
    generate_interview_prep_action,
    get_interview_prep_action,
} from "@/server/actions/anthropic-actions";
import type { InterviewPrepDTO } from "@/types";

type Props = {
    applicationId: number;
    currentStage: string | null;
};

/**
 * Claude interview prep — rendered in the application detail right
 * column, next to the Interview Status card. Only renders when the
 * anthropic-screening plugin is installed + active for this org
 * (usePluginSystem flags); otherwise the page is unchanged.
 *
 * Shows the latest stored generation (model, generated-at, stage
 * snapshot) with a warning when the candidate has since moved stage,
 * and offers Generate / Regenerate to anyone holding
 * candidate:evaluate. A failed Claude call surfaces its real error —
 * never fake questions.
 */
const InterviewPrepCard = ({ applicationId, currentStage }: Props) => {
    const { isEnabled } = usePluginSystem();
    const hasPermission = useHasPermission();
    const canGenerate = hasPermission("candidate:evaluate");

    const [prep, setPrep] = useState<InterviewPrepDTO | null>(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const enabled = isEnabled("anthropic-screening");

    const load = useCallback(async () => {
        try {
            const res = await get_interview_prep_action(applicationId);
            if (res.success) {
                setPrep(res.prep);
                setTotal(res.total);
            } else {
                setError(res.message ?? "Could not load interview prep");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load interview prep");
        } finally {
            setLoading(false);
        }
    }, [applicationId]);

    useEffect(() => {
        if (!enabled) return;
        load();
    }, [enabled, load]);

    if (!enabled) return null;

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        try {
            const res = await generate_interview_prep_action(applicationId);
            if (!res.success || !res.prep) {
                setError(res.message);
                return;
            }
            setPrep(res.prep);
            setTotal((t) => t + 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not generate interview questions. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const isStaleStage =
        prep?.stage_name != null &&
        currentStage != null &&
        prep.stage_name !== currentStage;

    // Group questions by category, keeping first-appearance order.
    const grouped: { category: string; items: InterviewPrepDTO["questions"] }[] = [];
    for (const q of prep?.questions ?? []) {
        const group = grouped.find((g) => g.category === q.category);
        if (group) group.items.push(q);
        else grouped.push({ category: q.category, items: [q] });
    }

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    Interview Prep · Claude
                </h3>
                {prep && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider bg-muted text-muted-foreground border-border">
                        {total > 1 ? `Generation ${total}` : "Generated"}
                    </span>
                )}
            </div>

            {loading ? (
                <p className="text-xs text-muted-foreground">Loading interview prep…</p>
            ) : (
                <>
                    {prep ? (
                        <div className="space-y-4">
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>
                                    Model <span className="font-mono font-semibold text-foreground">{prep.model}</span>
                                    {" · "}
                                    {new Date(prep.generated_at).toLocaleString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                    })}
                                </p>
                                <p>
                                    Generated for stage:{" "}
                                    <span className="font-semibold text-foreground">{prep.stage_name ?? "unknown"}</span>
                                </p>
                            </div>

                            {isStaleStage && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                                    The candidate has since moved to {currentStage} — these
                                    questions were written for {prep.stage_name}. Regenerate
                                    for stage-aware questions.
                                </p>
                            )}

                            <div className="space-y-4">
                                {grouped.map((group) => (
                                    <div key={group.category}>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">
                                            {group.category}
                                        </p>
                                        <ol className="space-y-3 list-decimal list-inside">
                                            {group.items.map((q, i) => (
                                                <li key={`${group.category}-${i}`} className="text-sm text-foreground">
                                                    {q.question}
                                                    <span className="block text-xs text-muted-foreground mt-0.5 pl-5">
                                                        {q.rationale}
                                                    </span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-muted rounded-xl border border-border space-y-3">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Stage-aware insights
                                </p>
                                <p className="text-sm text-foreground">{prep.insights.summary}</p>
                                {prep.insights.strengths.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">Strengths</p>
                                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 mt-1">
                                            {prep.insights.strengths.map((s, i) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {prep.insights.risks.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">Risks / gaps to probe</p>
                                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 mt-1">
                                            {prep.insights.risks.map((s, i) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {prep.insights.focusAreas.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">Focus areas for this stage</p>
                                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 mt-1">
                                            {prep.insights.focusAreas.map((s, i) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-muted rounded-xl border border-dashed border-border">
                            <p className="text-xs text-muted-foreground mb-3">
                                No interview questions generated yet. Claude writes them
                                from the real job description and the candidate&apos;s
                                resume, tailored to the current stage.
                            </p>
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                            {error}
                        </p>
                    )}

                    {canGenerate && (
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full py-2.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-all shadow-sm disabled:opacity-50"
                        >
                            {generating
                                ? "Asking Claude…"
                                : prep
                                  ? "Regenerate questions"
                                  : "Generate interview questions"}
                        </button>
                    )}
                    {!canGenerate && (
                        <p className="text-xs text-muted-foreground text-center">
                            Generating questions needs the candidate:evaluate permission.
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

export default InterviewPrepCard;
