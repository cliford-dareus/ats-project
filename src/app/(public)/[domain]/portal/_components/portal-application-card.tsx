import Link from "next/link";
import type { PortalApplication } from "@/server/portal/portal-service";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
    format_portal_date,
    format_portal_datetime,
    interview_status_label,
    interview_type_label,
    portal_status_label,
    portal_timeline,
} from "./portal-helpers";

/**
 * One application on the candidate portal. Renders ONLY what the portal
 * contract returns: job title, org name, applied date, stage/status,
 * interviews and the candidate's own screening answers. No recruiter
 * notes, feedback, scorecards, other candidates, salary or referral data
 * ever reaches this component.
 */
const PortalApplicationCard = ({ application }: { application: PortalApplication }) => {
    const statusLabel = portal_status_label(application);
    const timeline = portal_timeline(application);
    const isTerminal = application.status === "REJECTED" || application.status === "HIRED";

    // Interviews earliest first; rows without a start time go last.
    const interviews = [...application.interviews].sort((a, b) => {
        const aTime = a.startAt ? new Date(a.startAt).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.startAt ? new Date(b.startAt).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
    });
    const now = Date.now();

    return (
        <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900">{application.jobTitle}</h2>
                    <p className="text-sm text-zinc-500 mt-1">
                        {application.orgName} · Applied {format_portal_date(application.appliedAt)}
                    </p>
                </div>
                <span
                    className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                        isTerminal
                            ? "border-zinc-200 bg-zinc-100 text-zinc-600"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700",
                    )}
                >
                    {statusLabel}
                </span>
            </div>

            {/* Timeline — steps render as reached only when the data
                supports them (see portal_timeline in portal-helpers). */}
            <ol className="mt-8 flex">
                {timeline.map((step, index) => (
                    <li key={step.id} className="flex-1">
                        <div
                            className={cn(
                                "h-1 rounded-full",
                                step.reached ? "bg-zinc-900" : "bg-zinc-200",
                                index > 0 && "ml-1",
                            )}
                        />
                        <p
                            className={cn(
                                "mt-2 text-xs font-medium",
                                step.reached ? "text-zinc-900" : "text-zinc-400",
                            )}
                        >
                            {step.label}
                        </p>
                    </li>
                ))}
            </ol>

            {/* Interviews — real rows only, date/time in UTC. */}
            {interviews.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                        Interviews
                    </h3>
                    <ul className="mt-3 space-y-3">
                        {interviews.map((interview) => {
                            const startTime = interview.startAt
                                ? new Date(interview.startAt).getTime()
                                : null;
                            const isCancelled = interview.status === "CANCELLED";
                            const isUpcoming =
                                !isCancelled && startTime !== null && startTime > now;
                            const statusText = interview_status_label(interview.status);
                            return (
                                <li
                                    key={interview.id}
                                    className="rounded-lg border border-zinc-200 px-4 py-3"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-zinc-900">
                                            {interview_type_label(interview.type)} interview
                                        </p>
                                        <span className="text-xs font-medium text-zinc-500">
                                            {isCancelled
                                                ? "Cancelled"
                                                : isUpcoming
                                                  ? "Upcoming"
                                                  : "Past"}
                                            {statusText && statusText !== "Scheduled" && !isCancelled
                                                ? ` · ${statusText}`
                                                : ""}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        {format_portal_datetime(interview.startAt)}
                                        {interview.endAt
                                            ? ` – ${new Intl.DateTimeFormat("en-US", {
                                                  hour: "numeric",
                                                  minute: "2-digit",
                                                  timeZone: "UTC",
                                              }).format(new Date(interview.endAt))} UTC`
                                            : ""}
                                    </p>
                                    {interview.locations && (
                                        <p className="mt-1 text-sm text-zinc-500">
                                            {interview.locations}
                                        </p>
                                    )}
                                    {interview.link && (
                                        <p className="mt-1 text-sm">
                                            <Link
                                                href={interview.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-zinc-900 underline underline-offset-2"
                                            >
                                                Join interview
                                            </Link>
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* The candidate's own screening answers — question + answer. */}
            {application.screeningAnswers.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                        Your answers
                    </h3>
                    <dl className="mt-3 space-y-4">
                        {application.screeningAnswers.map((answer, index) => (
                            <div key={`${answer.questionText}-${index}`}>
                                <dt className="text-sm font-medium text-zinc-900">
                                    {answer.questionText}
                                </dt>
                                <dd className="mt-1 text-sm text-zinc-500 whitespace-pre-wrap">
                                    {answer.answerText}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}
        </Card>
    );
};

export default PortalApplicationCard;
