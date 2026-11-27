"use client";

import ScheduleInterviewModal from "@/components/modal/schedule-interview-modal";
import { ApplicationResponseType, InterviewType } from "@/types";
import { Calendar, Clock, MapPin, Phone, Video } from "lucide-react";
import { useState } from "react";
import { useHasPermission } from "@/lib/use-permission";

type Props = {
    applicationResult: ApplicationResponseType;
};

/** Hold-aware status badge for the interview card. */
function hold_badge(interview: InterviewType | null | undefined): {
    label: string;
    className: string;
} {
    if (!interview) {
        return {
            label: "Not Booked",
            className: "bg-muted text-muted-foreground border-border",
        };
    }
    const hold_status = interview.hold_status ?? "NONE";
    const hold_expires_at = interview.hold_expires_at
        ? new Date(interview.hold_expires_at)
        : null;
    // A TENTATIVE hold past its expiry reads as expired even if the expiry
    // worker hasn't swept it yet (e.g. a transient calendar failure deferred it).
    const hold_expired =
        hold_status === "TENTATIVE" &&
        hold_expires_at != null &&
        hold_expires_at < new Date();

    if (hold_status === "TENTATIVE" && !hold_expired) {
        return {
            label: "Awaiting candidate",
            className: "bg-amber-50 text-amber-700 border-amber-100",
        };
    }
    if (hold_status === "CONFIRMED") {
        return {
            label: "Confirmed",
            className: "bg-emerald-50 text-emerald-700 border-emerald-100",
        };
    }
    if (hold_status === "DECLINED") {
        return {
            label: "Declined",
            className: "bg-red-50 text-red-700 border-red-100",
        };
    }
    if (hold_status === "EXPIRED" || hold_expired) {
        return {
            label: "Hold expired",
            className: "bg-amber-50 text-amber-700 border-amber-100",
        };
    }
    if (hold_status === "RELEASED") {
        return {
            label: "Hold released",
            className: "bg-muted text-muted-foreground border-border",
        };
    }
    return {
        label: "Booked",
        className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    };
}

function format_date_time(value: Date | string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    })} at ${date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    })}`;
}

/** B22-8: the real interview type/location — the old line hardcoded the
 * word `onsite` even for video interviews, and picked the icon from the
 * job's location instead of the interview. */
function interview_type_label(interview: InterviewType): string {
    switch (interview.type) {
        case "VIDEO":
            return interview.link ? "Video via link" : "Video";
        case "PHONE":
            return "Phone";
        case "ONSITE":
            return interview.locations ? `Onsite at ${interview.locations}` : "Onsite";
        default:
            return interview.locations ? `Onsite at ${interview.locations}` : "—";
    }
}

const ApplicationInterviewCard = ({ applicationResult }: Props) => {
    const hasPermission = useHasPermission();
    const canSchedule = hasPermission("interview:schedule");
    const [isOpen, setIsOpen] = useState(false);
    const interview = applicationResult.interview;
    const badge = hold_badge(interview);
    const hold_pending =
        interview?.hold_status === "TENTATIVE" &&
        interview.hold_expires_at != null &&
        new Date(interview.hold_expires_at) >= new Date();
    return (
        <>
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        Interview Status
                    </h3>
                    <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider ${badge.className}`}
                    >
                        {badge.label}
                    </span>
                </div>

                {applicationResult.interview ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-xl border border-border space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-card rounded-lg flex items-center justify-center shadow-sm">
                                    <Calendar className="w-4 h-4 text-brand-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                        Date & Time
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">
                                        {format_date_time(applicationResult.interview.start_at)}
                                    </p>
                                </div>
                            </div>

                            {hold_pending && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-card rounded-lg flex items-center justify-center shadow-sm">
                                        <Clock className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                            Hold expires
                                        </p>
                                        <p className="text-sm font-semibold text-amber-700">
                                            {format_date_time(interview?.hold_expires_at)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-card rounded-lg flex items-center justify-center shadow-sm">
                                    {applicationResult.interview.type === "VIDEO" ? (
                                        <Video className="w-4 h-4 text-brand-600" />
                                    ) : applicationResult.interview.type === "PHONE" ? (
                                        <Phone className="w-4 h-4 text-brand-600" />
                                    ) : (
                                        <MapPin className="w-4 h-4 text-brand-600" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                        Type & Location
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">
                                        {interview_type_label(applicationResult.interview)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {applicationResult.interview.link &&
                            !["DECLINED", "EXPIRED", "RELEASED"].includes(
                                applicationResult.interview.hold_status ?? "NONE"
                            ) && (
                                <a
                                    href={applicationResult.interview.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-2.5 bg-brand-50 text-brand-700 rounded-xl text-xs font-bold hover:bg-brand-100 transition-all flex items-center justify-center gap-2 border border-brand-100"
                                >
                                    <Video className="w-4 h-4" />
                                    Join Interview
                                </a>
                            )}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-muted rounded-xl border border-dashed border-border">
                        <p className="text-xs text-muted-foreground mb-3">
                            No interview has been scheduled yet.
                        </p>
                        {canSchedule && (
                            <button onClick={() => setIsOpen(true)} className="px-4 py-2 bg-card border border-border rounded-lg text-xs font-bold text-accent hover:bg-muted transition-all shadow-sm">
                                Schedule Interview
                            </button>
                        )}
                    </div>
                )}
            </div>

            <ScheduleInterviewModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                application={applicationResult}
                jobDetails={{ jobName: applicationResult.job_apply, department: applicationResult.department }}
            />
        </>
    );
};

export default ApplicationInterviewCard;
