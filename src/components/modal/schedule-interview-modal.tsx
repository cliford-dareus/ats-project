"use client";

import React, { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createCalendarEvent } from "@/server/google-calenda";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    Command,
    Copy,
    Loader2,
    Lock,
    Send,
    Users,
    X,
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { ApplicationResponseType, ApplicationType } from "@/types";
import {
    create_interview_action,
    create_interview_hold_action,
} from "@/server/actions/interview-actions";
import {
    get_org_members_action,
    OrgMemberDTO,
} from "@/server/actions/member-actions";
import {
    check_interview_availability_action,
    InterviewAvailabilityConflict,
} from "@/server/actions/interview-availability-actions";
import {
    check_calendly_availability_action,
    create_calendly_interview_action,
    list_calendly_event_types_action,
    type CalendlyEventTypeDTO,
} from "@/server/actions/calendly-actions";
import { newInterviewSchema } from "@/zod";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type AvailabilityState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "free" }
    | { status: "conflicts"; conflicts: InterviewAvailabilityConflict[] }
    | { status: "not-connected" }
    | { status: "error"; error: string };

/** Conflict times are UTC — the modal's inputs are UTC too. */
const format_conflict_time = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
    });

type Props = {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    application: ApplicationType | ApplicationResponseType;
    jobDetails: { jobName: string; department: string };
};

export const interviewScheduleSchema = z.object({
    date: z.string(),
    time: z.string(),
    duration: z.string(),
    type: z.enum(["ONSITE", "VIDEO", "PHONE"]),
    use_hold: z.boolean().default(true),
    hold_hours: z.string().default("48"),
});

const ScheduleInterviewModal = ({
    isOpen,
    setIsOpen,
    application,
    jobDetails,
}: Props) => {
    const { user } = useUser();
    const [isScheduling, setIsScheduling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [holdLink, setHoldLink] = useState<string | null>(null);
    const [holdEmailSent, setHoldEmailSent] = useState(false);
    const [holdEmail, setHoldEmail] = useState<string | null>(null);

    // D4 — interviewer picker. Members load when the modal opens; a load
    // failure (e.g. no "member:view") degrades to an honest note and
    // scheduling continues without interviewers.
    const [members, setMembers] = useState<OrgMemberDTO[] | null>(null);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);
    const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<
        string[]
    >([]);

    // D8 — calendar availability status line + "schedule anyway" override.
    const [availability, setAvailability] = useState<AvailabilityState>({
        status: "idle",
    });
    const [scheduleAnyway, setScheduleAnyway] = useState(false);
    const availabilityRequestId = useRef(0);

    // Calendly — offered only when the org has Calendly connected. The
    // booking lives in Calendly (no Google event, no hold); availability
    // comes from Calendly's offered times, and there is no "schedule
    // anyway" on this path — the API would fail.
    const [provider, setProvider] = useState<"google" | "calendly">("google");
    const [calendlyEventTypes, setCalendlyEventTypes] = useState<
        CalendlyEventTypeDTO[]
    >([]);
    const [calendlyConnected, setCalendlyConnected] = useState(false);
    const [calendlyLoadError, setCalendlyLoadError] = useState<string | null>(
        null
    );
    const [selectedEventTypeUri, setSelectedEventTypeUri] = useState("");
    const [calendlyAvailability, setCalendlyAvailability] = useState<
        | { status: "idle" }
        | { status: "checking" }
        | { status: "free" }
        | { status: "unavailable"; message: string }
        | { status: "error"; error: string }
    >({ status: "idle" });
    // When a Calendly booking fails (e.g. the Free-plan 5/day cap), the
    // modal offers the event type's real public booking link instead —
    // no fake interview row is ever created for it.
    const [fallbackBookingUrl, setFallbackBookingUrl] = useState<string | null>(
        null
    );
    const [fallbackCopied, setFallbackCopied] = useState(false);

    const selectedEventType = calendlyEventTypes.find(
        (et) => et.uri === selectedEventTypeUri
    );

    const selectedInterviewers = (members ?? []).filter((member) =>
        selectedInterviewerIds.includes(member.id)
    );
    const selectedInterviewerEmails = selectedInterviewers.map(
        (member) => member.email
    );

    const toggleInterviewer = (id: string) => {
        setSelectedInterviewerIds((prev) =>
            prev.includes(id)
                ? prev.filter((selected) => selected !== id)
                : [...prev, id]
        );
    };

    const resetModalState = () => {
        setHoldLink(null);
        setError(null);
        setHoldEmailSent(false);
        setHoldEmail(null);
        setSelectedInterviewerIds([]);
        setAvailability({ status: "idle" });
        setScheduleAnyway(false);
        setProvider("google");
        setSelectedEventTypeUri("");
        setCalendlyAvailability({ status: "idle" });
        setFallbackBookingUrl(null);
        setFallbackCopied(false);
    };

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setMembersLoading(true);
        setMembersError(null);
        get_org_members_action()
            .then((list) => {
                if (!cancelled) setMembers(list);
            })
            .catch((err) => {
                if (!cancelled) {
                    setMembersError(
                        err instanceof Error
                            ? err.message
                            : "Couldn't load team members"
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setMembersLoading(false);
            });
        // Calendly event types (live) — a load failure degrades to
        // Google-only scheduling; the modal never claims Calendly is
        // available when it couldn't be verified.
        list_calendly_event_types_action()
            .then((result) => {
                if (cancelled) return;
                if (result.success) {
                    setCalendlyConnected(true);
                    setCalendlyEventTypes(result.eventTypes);
                    setCalendlyLoadError(null);
                } else if (result.connected === false) {
                    setCalendlyConnected(false);
                    setCalendlyEventTypes([]);
                } else {
                    setCalendlyLoadError(result.message);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setCalendlyLoadError(
                        err instanceof Error
                            ? err.message
                            : "Couldn't load Calendly event types"
                    );
                }
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    const form = useForm<z.infer<typeof interviewScheduleSchema>>({
        resolver: zodResolver(interviewScheduleSchema),
        defaultValues: {
            date: "",
            time: "",
            duration: "30",
            type: "VIDEO",
            use_hold: true,
            hold_hours: "48",
        },
    });

    const useHold = form.watch("use_hold");
    const watchedDate = form.watch("date");
    const watchedTime = form.watch("time");
    const watchedDuration = form.watch("duration");

    // D8 — debounced availability check as date/time/duration change.
    // Never claims a check happened when it didn't: missing/invalid inputs
    // leave the status idle, and a failed check surfaces as "error".
    useEffect(() => {
        if (provider === "calendly") {
            // Calendly availability is checked by the effect below, not Google.
            setAvailability({ status: "idle" });
            return;
        }
        if (!isOpen || holdLink) {
            setAvailability({ status: "idle" });
            return;
        }
        if (!watchedDate || !watchedTime) {
            setAvailability({ status: "idle" });
            return;
        }
        const start = new Date(`${watchedDate}T${watchedTime}:00Z`);
        const end = new Date(
            start.getTime() + parseInt(watchedDuration || "30", 10) * 60000
        );
        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end <= start
        ) {
            setAvailability({ status: "idle" });
            return;
        }
        // The slot changed, so a previous override no longer applies.
        setScheduleAnyway(false);
        setAvailability({ status: "checking" });
        const requestId = ++availabilityRequestId.current;
        const timer = setTimeout(async () => {
            try {
                const result = await check_interview_availability_action({
                    start_at: start,
                    end_at: end,
                });
                if (availabilityRequestId.current !== requestId) return;
                if (result.error) {
                    setAvailability({ status: "error", error: result.error });
                } else if (!result.connected) {
                    setAvailability({ status: "not-connected" });
                } else if (result.conflicts.length > 0) {
                    setAvailability({
                        status: "conflicts",
                        conflicts: result.conflicts,
                    });
                } else {
                    setAvailability({ status: "free" });
                }
            } catch (err) {
                if (availabilityRequestId.current !== requestId) return;
                setAvailability({
                    status: "error",
                    error:
                        err instanceof Error
                            ? err.message
                            : "Availability check failed",
                });
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [isOpen, holdLink, watchedDate, watchedTime, watchedDuration, provider]);

    // Calendly — debounced offered-slot check as date/time/event type
    // change. A slot Calendly doesn't offer BLOCKS booking (no "schedule
    // anyway" — the API call would fail).
    useEffect(() => {
        if (provider !== "calendly" || !isOpen || holdLink) {
            setCalendlyAvailability({ status: "idle" });
            return;
        }
        if (!selectedEventTypeUri || !watchedDate || !watchedTime) {
            setCalendlyAvailability({ status: "idle" });
            return;
        }
        const start = new Date(`${watchedDate}T${watchedTime}:00Z`);
        const end = new Date(
            start.getTime() + parseInt(watchedDuration || "30", 10) * 60000
        );
        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end <= start
        ) {
            setCalendlyAvailability({ status: "idle" });
            return;
        }
        setCalendlyAvailability({ status: "checking" });
        const timer = setTimeout(async () => {
            try {
                const result = await check_calendly_availability_action({
                    eventTypeUri: selectedEventTypeUri,
                    start_at: start,
                    end_at: end,
                });
                if (result.available) {
                    setCalendlyAvailability({ status: "free" });
                } else {
                    setCalendlyAvailability({
                        status: "unavailable",
                        message: result.message,
                    });
                }
            } catch (err) {
                setCalendlyAvailability({
                    status: "error",
                    error:
                        err instanceof Error
                            ? err.message
                            : "Availability check failed",
                });
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [isOpen, holdLink, provider, selectedEventTypeUri, watchedDate, watchedTime, watchedDuration]);

    const handleSchedule = async (
        data: z.infer<typeof interviewScheduleSchema>
    ) => {
        setIsScheduling(true);
        setError(null);
        setHoldLink(null);
        setHoldEmailSent(false);
        setHoldEmail(null);

        const startDateTime = new Date(`${data.date}T${data.time}:00Z`);
        const endDateTime = new Date(
            startDateTime.getTime() + parseInt(data.duration || "30", 10) * 60000
        );

        try {
            const candidateName =
                "candidate" in application
                    ? application.candidate.name
                    : application.candidate_name;
            const candidateEmail =
                "candidate" in application
                    ? application.candidate.email
                    : application.candidate_email;

            // D4 — only pass interviewers when any are selected; the
            // scheduler themself is never auto-added (they own the event).
            const interviewerFields =
                selectedInterviewerIds.length > 0
                    ? {
                          interviewer_ids: selectedInterviewerIds,
                          interviewer_emails: selectedInterviewerEmails,
                      }
                    : {};

            // Calendly path — server-side booking (the PAT never leaves
            // the server). No hold, no Google event: the recruiter picks a
            // real event type and the API books the candidate into it.
            if (provider === "calendly") {
                if (!selectedEventType) {
                    setError("Pick a Calendly event type first.");
                    return;
                }
                try {
                    await create_calendly_interview_action({
                        applicationId: application.id,
                        job_id: application.job_id,
                        job_name: jobDetails.jobName,
                        candidate_name: candidateName,
                        candidate_email: candidateEmail,
                        start_at: startDateTime,
                        end_at: endDateTime,
                        type: data.type,
                        location: data.type === "ONSITE" ? "Office" : data.type,
                        interviewer_ids: selectedInterviewerIds,
                        eventTypeUri: selectedEventType.uri,
                        eventTypeName: selectedEventType.name,
                        eventTypeSchedulingUrl: selectedEventType.schedulingUrl,
                    });
                    setIsOpen(false);
                } catch (calErr) {
                    // The real Calendly error is surfaced, nothing was
                    // created — and the event type's public booking link
                    // is offered as the fallback the recruiter can send.
                    setError((calErr as Error).message);
                    setFallbackBookingUrl(selectedEventType.schedulingUrl);
                }
                return;
            }

            // D8 — fresh pre-flight availability check (Google path only).
            // A failed or unconnected check never blocks submit: the
            // hold/direct calls below fail honestly themselves when the
            // calendar is needed. Only a confirmed conflict blocks, unless
            // overridden.
            try {
                const check = await check_interview_availability_action({
                    start_at: startDateTime,
                    end_at: endDateTime,
                });
                if (check.error) {
                    setAvailability({ status: "error", error: check.error });
                } else if (!check.connected) {
                    setAvailability({ status: "not-connected" });
                } else if (check.conflicts.length > 0) {
                    setAvailability({
                        status: "conflicts",
                        conflicts: check.conflicts,
                    });
                    if (!scheduleAnyway) {
                        setError(
                            "That time conflicts with an event on your calendar. Pick another time, or check “Schedule anyway” to book it regardless."
                        );
                        return;
                    }
                } else {
                    setAvailability({ status: "free" });
                }
            } catch (checkErr) {
                setAvailability({
                    status: "error",
                    error:
                        checkErr instanceof Error
                            ? checkErr.message
                            : "Availability check failed",
                });
            }

            if (data.use_hold) {
                const res = await create_interview_hold_action({
                    applicationId: application.id,
                    job_id: application.job_id,
                    job_name: jobDetails.jobName,
                    candidate_name: candidateName,
                    candidate_email: candidateEmail,
                    start_at: startDateTime,
                    end_at: endDateTime,
                    type: data.type,
                    location: data.type === "ONSITE" ? "Office" : data.type,
                    hold_hours: parseInt(data.hold_hours || "48", 10),
                    ...interviewerFields,
                });

                setHoldLink(res.confirm_url);
                setHoldEmailSent(res.email_sent ?? false);
                setHoldEmail(candidateEmail);
                return;
            }

            // Direct schedule (legacy path)
            const cal = await createCalendarEvent({
                clerkUserId: user?.id as string,
                payload: {
                    summary: `Interview: ${candidateName} for ${jobDetails.jobName}`,
                    description: `Interview with ${candidateName} for the ${jobDetails.jobName} position in ${jobDetails.department}.`,
                    startDateTime: startDateTime.toISOString(),
                    endDateTime: endDateTime.toISOString(),
                    attendeeEmail: candidateEmail,
                    ...(selectedInterviewerEmails.length > 0
                        ? { interviewerEmails: selectedInterviewerEmails }
                        : {}),
                },
            });

            if (cal?.success) {
                const payload = {
                    applicationId: application.id,
                    job_id: application.job_id,
                    start_at: startDateTime,
                    end_at: endDateTime,
                    link: cal?.meetLink ? cal.meetLink : undefined,
                    // D7 — mirror the hold path exactly; no fake city.
                    location: data.type === "ONSITE" ? "Office" : data.type,
                    status: "SCHEDULE",
                    type: data.type,
                    // Store the Google event so reschedule can patch it.
                    calendar_event_id: cal.eventId,
                    calendar_owner_id: user?.id,
                    ...(selectedInterviewerIds.length > 0
                        ? { interviewer_ids: selectedInterviewerIds }
                        : {}),
                } as z.infer<typeof newInterviewSchema>;

                await create_interview_action(payload);
                setIsOpen(false);
            } else {
                setError(cal.error || "Failed to schedule interview");
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsScheduling(false);
        }
    };

    const copyLink = async () => {
        if (!holdLink) return;
        await navigator.clipboard.writeText(holdLink);
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) {
                    resetModalState();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Command />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl uppercase">
                            Schedule Interview
                        </DialogTitle>
                        <DialogDescription>
                            Hold a slot on calendars until the candidate confirms.
                            Times are in UTC.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {holdLink ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                                <Lock className="size-4" />
                                Tentative hold placed
                            </div>
                            <p className="text-xs text-emerald-700 leading-relaxed">
                                Interviewers&lsquo; calendars are blocked. Send this link to the
                                candidate — when they confirm, the event becomes final; if they
                                decline or the hold expires, the slot is released.
                            </p>
                        </div>
                        {holdEmailSent && holdEmail ? (
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Confirmation email sent to {holdEmail} — the link below is a
                                backup if needed.
                            </p>
                        ) : (
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                We couldn&apos;t email the candidate automatically — send them
                                the link below.
                            </p>
                        )}
                        <div className="flex gap-2">
                            <Input readOnly value={holdLink} className="text-xs rounded-xl" />
                            <Button type="button" variant="outline" onClick={copyLink} className="rounded-xl shrink-0">
                                <Copy className="size-4" />
                            </Button>
                        </div>
                        <Button
                            type="button"
                            className="w-full rounded-xl"
                            onClick={() => setIsOpen(false)}
                        >
                            Done
                        </Button>
                    </div>
                ) : (
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSchedule)}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                                <div className="space-y-0.5">
                                    <Label htmlFor="use_hold" className="text-sm font-semibold">
                                        Smart hold (recommended)
                                    </Label>
                                    <p className="text-[11px] text-zinc-500">
                                        {provider === "calendly"
                                            ? "Holds use Google Calendar — Calendly bookings go straight to the candidate's chosen slot"
                                            : "Tentative calendar block until candidate confirms"}
                                    </p>
                                </div>
                                <FormField
                                    name="use_hold"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Switch
                                            id="use_hold"
                                            checked={provider === "calendly" ? false : field.value}
                                            disabled={provider === "calendly"}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                            </div>

                            {(calendlyConnected || calendlyLoadError) && (
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                        Book with
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setProvider("google")}
                                            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold text-left ${provider === "google" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}
                                        >
                                            Google Calendar
                                            <span className="block text-[11px] font-normal opacity-70">
                                                Meet link + optional hold
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProvider("calendly");
                                                form.setValue("use_hold", false);
                                            }}
                                            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold text-left ${provider === "calendly" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}
                                        >
                                            Calendly
                                            <span className="block text-[11px] font-normal opacity-70">
                                                Books straight into Calendly
                                            </span>
                                        </button>
                                    </div>
                                    {calendlyLoadError && (
                                        <p className="text-[11px] text-amber-600">
                                            Couldn&apos;t load Calendly event types ({calendlyLoadError}) — Google scheduling still works.
                                        </p>
                                    )}
                                </div>
                            )}

                            {provider === "calendly" && (
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                        Calendly event type
                                    </label>
                                    <Select
                                        value={selectedEventTypeUri}
                                        onValueChange={setSelectedEventTypeUri}
                                    >
                                        <SelectTrigger className="rounded-xl bg-zinc-50">
                                            {selectedEventType
                                                ? `${selectedEventType.name} · ${selectedEventType.duration} min`
                                                : "Pick an event type"}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {calendlyEventTypes.map((et) => (
                                                <SelectItem key={et.uri} value={et.uri}>
                                                    {et.name} · {et.duration} min
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="mt-1 ml-1 text-[11px] text-zinc-500">
                                        The booking is made under the connected Calendly account — selected
                                        interviewers are recorded on the interview and emailed, but they
                                        don&apos;t get their own Calendly event.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                        Interview Date
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                        <FormField
                                            name="date"
                                            control={form.control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    type="date"
                                                    required
                                                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                                                />
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                            Start Time (UTC)
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                            <FormField
                                                name="time"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <Input
                                                        {...field}
                                                        type="time"
                                                        required
                                                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                                                    />
                                                )}
                                            />
                                        </div>
                                        <p className="mt-1 ml-1 text-[11px] text-zinc-500">
                                            Enter the time in UTC — the candidate email states UTC.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                            Duration
                                        </label>
                                        <FormField
                                            name="duration"
                                            control={form.control}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger className="rounded-xl bg-zinc-50">
                                                        {field.value ? `${field.value} min` : "Duration"}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="15">15 Minutes</SelectItem>
                                                        <SelectItem value="30">30 Minutes</SelectItem>
                                                        <SelectItem value="45">45 Minutes</SelectItem>
                                                        <SelectItem value="60">1 Hour</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                            Type
                                        </label>
                                        <FormField
                                            name="type"
                                            control={form.control}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger className="rounded-xl bg-zinc-50">
                                                        {field.value}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ONSITE">In-Person</SelectItem>
                                                        <SelectItem value="VIDEO">Video</SelectItem>
                                                        <SelectItem value="PHONE">Phone</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                    {useHold && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                                Hold expires in
                                            </label>
                                            <FormField
                                                name="hold_hours"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger className="rounded-xl bg-zinc-50">
                                                            {field.value}h
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="24">24 hours</SelectItem>
                                                            <SelectItem value="48">48 hours</SelectItem>
                                                            <SelectItem value="72">72 hours</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Interviewers (optional)
                                </label>
                                {selectedInterviewers.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {selectedInterviewers.map((member) => (
                                            <span
                                                key={member.id}
                                                className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white"
                                            >
                                                {member.name}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleInterviewer(member.id)
                                                    }
                                                    aria-label={`Remove ${member.name}`}
                                                    className="rounded-full hover:bg-zinc-700"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {membersLoading ? (
                                    <p className="text-xs text-zinc-500 flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Loading team members…
                                    </p>
                                ) : membersError ? (
                                    <p className="text-xs text-amber-600 leading-relaxed">
                                        Couldn&apos;t load team members
                                        ({membersError}). You can still schedule
                                        without interviewers.
                                    </p>
                                ) : members && members.length === 0 ? (
                                    <p className="text-xs text-zinc-500">
                                        No other team members found — the interview
                                        will only include you and the candidate.
                                    </p>
                                ) : (
                                    <div className="max-h-36 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50">
                                        {(members ?? []).map((member) => (
                                            <label
                                                key={member.id}
                                                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-100"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedInterviewerIds.includes(
                                                        member.id
                                                    )}
                                                    onChange={() =>
                                                        toggleInterviewer(member.id)
                                                    }
                                                    className="size-4 accent-zinc-900"
                                                />
                                                <span className="font-medium text-zinc-800">
                                                    {member.name}
                                                </span>
                                                <span className="text-xs text-zinc-400 truncate">
                                                    {member.email}
                                                </span>
                                                <span className="ml-auto shrink-0 text-[11px] font-semibold text-zinc-500">
                                                    {member.role}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                <p className="mt-1 ml-1 text-[11px] text-zinc-500 flex items-start gap-1">
                                    <Users className="w-3.5 h-3.5 shrink-0 mt-px" />
                                    {provider === "calendly"
                                        ? "Selected interviewers are recorded on the interview and emailed. The booking itself is under the connected Calendly account."
                                        : "Selected interviewers are added as calendar attendees. You already own the event, so you don't need to add yourself."}
                                </p>
                            </div>

                            {provider === "google" && availability.status === "checking" && (
                                <p className="text-xs text-zinc-500 flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Checking your calendar…
                                </p>
                            )}
                            {provider === "google" && availability.status === "free" && (
                                <p className="text-xs text-emerald-600 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    No conflicts on your calendar
                                </p>
                            )}
                            {provider === "google" && availability.status === "conflicts" && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-2">
                                    <p className="flex items-start gap-2 text-red-600 text-xs font-semibold">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        This time conflicts with your calendar:
                                    </p>
                                    <ul className="ml-6 space-y-1 text-xs text-red-600">
                                        {availability.conflicts.map(
                                            (conflict, index) => (
                                                <li key={index}>
                                                    {format_conflict_time(
                                                        conflict.start
                                                    )}
                                                    {" – "}
                                                    {format_conflict_time(
                                                        conflict.end
                                                    )}{" "}
                                                    UTC
                                                    {conflict.summary
                                                        ? ` — ${conflict.summary}`
                                                        : ""}
                                                </li>
                                            )
                                        )}
                                    </ul>
                                    <label className="ml-6 flex items-center gap-2 text-xs text-red-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={scheduleAnyway}
                                            onChange={(e) =>
                                                setScheduleAnyway(
                                                    e.target.checked
                                                )
                                            }
                                            className="size-4 accent-red-600"
                                        />
                                        Schedule anyway despite the conflict
                                    </label>
                                </div>
                            )}
                            {provider === "google" && availability.status === "not-connected" && (
                                <p className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs leading-relaxed">
                                    Google Calendar isn&apos;t connected, so
                                    availability couldn&apos;t be checked —
                                    connect it in Settings.
                                </p>
                            )}
                            {provider === "google" && availability.status === "error" && (
                                <p className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs leading-relaxed">
                                    Couldn&apos;t check availability (
                                    {availability.error}). You can still schedule
                                    — the calendar step will fail honestly if it
                                    can&apos;t run.
                                </p>
                            )}

                            {provider === "calendly" && calendlyAvailability.status === "checking" && (
                                <p className="text-xs text-zinc-500 flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Checking Calendly availability…
                                </p>
                            )}
                            {provider === "calendly" && calendlyAvailability.status === "free" && (
                                <p className="text-xs text-emerald-600 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    That time is offered on Calendly
                                </p>
                            )}
                            {provider === "calendly" && calendlyAvailability.status === "unavailable" && (
                                <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs leading-relaxed">
                                    {calendlyAvailability.message}
                                </p>
                            )}
                            {provider === "calendly" && calendlyAvailability.status === "error" && (
                                <p className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs leading-relaxed">
                                    Couldn&apos;t check Calendly availability (
                                    {calendlyAvailability.error}). You can still try to book — the
                                    booking will fail honestly if the slot isn&apos;t offered.
                                </p>
                            )}

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-xs">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            {provider === "calendly" && fallbackBookingUrl && (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                        No interview was created. Send the candidate the booking link
                                        instead — they can pick a time themselves:
                                    </p>
                                    <div className="flex gap-2">
                                        <Input readOnly value={fallbackBookingUrl} className="text-xs rounded-xl" />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(fallbackBookingUrl);
                                                setFallbackCopied(true);
                                            }}
                                            className="rounded-xl shrink-0"
                                        >
                                            <Copy className="size-4" />
                                            {fallbackCopied ? "Copied" : "Copy"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 py-3 bg-zinc-50 text-zinc-600 rounded-xl font-bold hover:bg-zinc-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <Button
                                    type="submit"
                                    disabled={
                                        isScheduling ||
                                        (provider === "google" &&
                                            availability.status === "conflicts" &&
                                            !scheduleAnyway) ||
                                        (provider === "calendly" &&
                                            (!selectedEventTypeUri ||
                                                calendlyAvailability.status === "unavailable"))
                                    }
                                    className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isScheduling ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {provider === "calendly"
                                                ? "Booking…"
                                                : useHold
                                                  ? "Holding…"
                                                  : "Scheduling…"}
                                        </>
                                    ) : provider === "calendly" ? (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Book via Calendly
                                        </>
                                    ) : useHold ? (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            Place hold
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Schedule now
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ScheduleInterviewModal;
