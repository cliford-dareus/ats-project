import React from "react";
import Link from "next/link";
import {
    ArrowRight,
    BriefcaseBusiness,
    Calendar,
    FileUser,
    History,
    Users,
} from "lucide-react";
import { get_activity_log_action } from "@/server/actions/activity-actions";
import { hasPermission } from "@/server/permissions";
import { Button } from "@/components/ui/button";
import type { ActivityLogEntry } from "@/server/queries/drizzle/activity";

const PAGE_SIZE = 20;

// Short labels for the dotted action strings. Includes the Trash agent's
// delete/restore actions so their entries render here too.
const ACTION_LABELS: Record<string, string> = {
    "job.created": "Job created",
    "job.published": "Job published",
    "job.draft_saved": "Draft saved",
    "job.deleted": "Job deleted",
    "job.restored": "Job restored",
    "job.permanently_deleted": "Job permanently deleted",
    "application.stage_moved": "Stage moved",
    "application.deleted": "Application deleted",
    "application.restored": "Application restored",
    "application.permanently_deleted": "Application permanently deleted",
    "candidate.status_changed": "Status changed",
    "candidate.deleted": "Candidate deleted",
    "candidate.restored": "Candidate restored",
    "candidate.permanently_deleted": "Candidate permanently deleted",
    "interview.scheduled": "Interview scheduled",
    "interview.rescheduled": "Interview rescheduled",
    "interview.cancelled": "Interview cancelled",
    "interview.feedback_submitted": "Feedback submitted",
};

const ENTITY_ICONS: Record<ActivityLogEntry["entity_type"], React.ComponentType<{ className?: string }>> = {
    job: BriefcaseBusiness,
    candidate: Users,
    application: FileUser,
    interview: Calendar,
};

const time_ago = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const Page = async ({ searchParams }: Props) => {
    const allowed = await hasPermission("job:view");
    if (!allowed) {
        return (
            <div className="p-4">
                <h1 className="text-xl font-bold">Activity</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    You don&apos;t have access to the activity log.
                </p>
            </div>
        );
    }

    const params = await searchParams;
    const rawPage = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

    const { total, entries } = await get_activity_log_action({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
    });
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="p-4">
            <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Activity</h1>
                <span className="text-sm text-muted-foreground">
                    {total} {total === 1 ? "entry" : "entries"}
                </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
                Who did what, newest first. Entries stay even after the job,
                candidate, application or interview they refer to is deleted.
            </p>

            {entries.length === 0 ? (
                <p className="mt-8 text-sm text-muted-foreground">
                    No activity yet — publishing a job, moving a candidate to a
                    new stage, or scheduling an interview will show up here.
                </p>
            ) : (
                <ul className="mt-6 space-y-2">
                    {entries.map((entry) => {
                        const Icon = ENTITY_ICONS[entry.entity_type];
                        return (
                            <li
                                key={entry.id}
                                className="flex items-start gap-3 rounded-md border bg-card px-3 py-2.5 shadow-sm"
                            >
                                <div className="rounded-full bg-primary/10 p-2">
                                    <Icon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm">
                                        <span className="font-semibold">{entry.actor_name}</span>{" "}
                                        <span className="text-muted-foreground">
                                            {ACTION_LABELS[entry.action] ?? entry.action} —{" "}
                                        </span>
                                        <span>{entry.summary}</span>
                                    </p>
                                    <p
                                        className="text-xs text-muted-foreground"
                                        title={entry.created_at.toLocaleString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                        })}
                                    >
                                        {time_ago(entry.created_at)}
                                    </p>
                                </div>
                                {entry.entity_href && (
                                    <Button variant="ghost" size="sm" asChild className="shrink-0">
                                        <Link href={entry.entity_href}>
                                            View
                                            <ArrowRight className="ml-1 h-3 w-3" />
                                        </Link>
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {pageCount > 1 && (
                <div className="mt-6 flex items-center gap-2">
                    {page > 1 ? (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/activity?page=${page - 1}`}>Previous</Link>
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" disabled>
                            Previous
                        </Button>
                    )}
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {pageCount}
                    </span>
                    {page < pageCount ? (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/activity?page=${page + 1}`}>Next</Link>
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" disabled>
                            Next
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Page;
