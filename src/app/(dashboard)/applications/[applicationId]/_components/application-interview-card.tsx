"use client";

import ScheduleInterviewModal from "@/components/modal/schedule-interview-modal";
import RescheduleInterviewModal from "@/components/modal/reschedule-interview-modal";
import { ApplicationResponseType, InterviewType } from "@/types";
import { Calendar, Clock, MapPin, Phone, Users, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useHasPermission } from "@/lib/use-permission";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    cancel_interview_action,
    get_interview_interviewers_action,
} from "@/server/actions/interview-actions";

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
    // InterviewType.status predates CANCELLED in the shared type, so the
    // cancelled check goes through a string comparison.
    if ((interview.status as string | null) === "CANCELLED") {
        return {
            label: "Cancelled",
            className: "bg-red-50 text-red-700 border-red-100",
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
 * job's location instead of the interview. Calendly interviews name their
 * provider (and event type when known) instead of pretending to be a
 * Google Meet link. */
function interview_type_label(interview: InterviewType): string {
    if (interview.scheduling_provider === "calendly") {
        return interview.calendly_event_type_name
            ? `Calendly · ${interview.calendly_event_type_name}`
            : "Calendly";
    }
    if (interview.scheduling_provider === "zoom") {
        return "Zoom";
    }
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

/** D1: only a live interview can be rescheduled or cancelled — a cancelled
 * interview or a dead hold (declined/expired/released) offers Schedule-new
 * instead, via the empty state below. */
function interview_is_live(interview: InterviewType | null | undefined): boolean {
    if (!interview) return false;
    if ((interview.status as string | null) === "CANCELLED") return false;
    if (interview.status === "SCHEDULE") return true;
    if (
        interview.status === "HOLD_PENDING" &&
        (interview.hold_status === "TENTATIVE" ||
            interview.hold_status === "CONFIRMED")
    ) {
        return true;
    }
    return false;
}

const ApplicationInterviewCard = ({ applicationResult }: Props) => {
    const router = useRouter();
    const hasPermission = useHasPermission();
    const canSchedule = hasPermission("interview:schedule");
    const canCancel = hasPermission("interview:cancel");
    const [isOpen, setIsOpen] = useState(false);
    const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [interviewers, setInterviewers] = useState<
        { id: string | number; name: string | null; email: string | null }[]
    >([]);
    const interview = applicationResult.interview;
    const badge = hold_badge(interview);
    const isLive = interview_is_live(interview);

    // Interviewer names for the card (resolved server-side from interviewer_ids).
    useEffect(() => {
        if (!interview?.id) {
            setInterviewers([]);
            return;
        }
        let cancelled = false;
        get_interview_interviewers_action(interview.id)
            .then((members) => {
                if (!cancelled) setInterviewers(members);
            })
            .catch(() => {
                // Names are nice-to-have; a failed lookup leaves the row hidden.
                if (!cancelled) setInterviewers([]);
            });
        return () => {
            cancelled = true;
        };
    }, [interview?.id]);

    const handleCancel = async () => {
        if (!interview) return;
        setIsCancelling(true);
        setCancelError(null);
        try {
            await cancel_interview_action({
                interviewId: interview.id,
                reason: cancelReason.trim() || undefined,
            });
            setIsCancelOpen(false);
            setCancelReason("");
            router.refresh();
        } catch (err) {
            setCancelError(
                err instanceof Error
                    ? err.message
                    : "Could not cancel the interview. Please try again."
            );
        } finally {
            setIsCancelling(false);
        }
    };
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

                            {interviewers.length > 0 && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-card rounded-lg flex items-center justify-center shadow-sm">
                                        <Users className="w-4 h-4 text-brand-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                            Interviewers
                                        </p>
                                        <p className="text-sm font-semibold text-foreground">
                                            {interviewers
                                                .map((m) => m.name ?? m.email ?? "Unknown")
                                                .join(", ")}
                                        </p>
                                    </div>
                                </div>
                            )}
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
                                    {applicationResult.interview.scheduling_provider === "calendly"
                                        ? "Join via Calendly"
                                        : applicationResult.interview.scheduling_provider === "zoom"
                                            ? "Join via Zoom"
                                            : "Join Interview"}
                                </a>
                            )}

                        {!applicationResult.interview.link &&
                            applicationResult.interview.scheduling_provider === "calendly" &&
                            applicationResult.interview.status !== "CANCELLED" && (
                                <p className="w-full py-2.5 bg-zinc-50 text-zinc-500 rounded-xl text-xs text-center border border-zinc-100">
                                    Booked via Calendly — no join link was returned. The candidate has
                                    the booking details by email.
                                </p>
                            )}

                        {isLive && (canSchedule || canCancel) && (
                            <div className="flex gap-2">
                                {canSchedule && (
                                    <button
                                        onClick={() => setIsRescheduleOpen(true)}
                                        className="flex-1 py-2.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-all shadow-sm"
                                    >
                                        Reschedule
                                    </button>
                                )}
                                {canCancel && (
                                    <button
                                        onClick={() => {
                                            setCancelError(null);
                                            setIsCancelOpen(true);
                                        }}
                                        className="flex-1 py-2.5 bg-card border border-red-200 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all shadow-sm"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
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

            {applicationResult.interview && (
                <RescheduleInterviewModal
                    isOpen={isRescheduleOpen}
                    setIsOpen={setIsRescheduleOpen}
                    interview={applicationResult.interview}
                />
            )}

            <Dialog
                open={isCancelOpen}
                onOpenChange={(open) => {
                    setIsCancelOpen(open);
                    if (!open) setCancelError(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl uppercase">
                            Cancel Interview
                        </DialogTitle>
                        <DialogDescription>
                            This releases the calendar event and emails the
                            candidate that the interview is cancelled. This
                            can&apos;t be undone — schedule a new interview
                            afterwards if needed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="cancel-reason">
                                Reason (optional)
                            </Label>
                            <Textarea
                                id="cancel-reason"
                                placeholder="e.g. Role put on hold"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                maxLength={255}
                            />
                        </div>
                        {cancelError && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                {cancelError}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsCancelOpen(false)}
                                disabled={isCancelling}
                            >
                                Keep interview
                            </Button>
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                onClick={handleCancel}
                                disabled={isCancelling}
                            >
                                {isCancelling
                                    ? "Cancelling…"
                                    : "Cancel interview"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ApplicationInterviewCard;
