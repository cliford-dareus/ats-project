"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { InterviewType } from "@/types";
import { reschedule_interview_action } from "@/server/actions/interview-actions";

type Props = {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    interview: InterviewType;
};

const rescheduleSchema = z.object({
    date: z.string().min(1, "Pick a date"),
    time: z.string().min(1, "Pick a time"),
    duration: z.string(),
    type: z.enum(["ONSITE", "VIDEO", "PHONE"]),
    location: z.string().min(1, "Add a location or link"),
});

/** UTC date/time parts of a stored interview time, for prefilling the form. */
function utc_parts(value: Date | string | null | undefined) {
    if (!value) return { date: "", time: "" };
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { date: "", time: "" };
    return {
        date: d.toISOString().slice(0, 10),
        time: d.toISOString().slice(11, 16),
    };
}

const RescheduleInterviewModal = ({ isOpen, setIsOpen, interview }: Props) => {
    const router = useRouter();
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof rescheduleSchema>>({
        resolver: zodResolver(rescheduleSchema),
        defaultValues: {
            date: "",
            time: "",
            duration: "30",
            type: "VIDEO",
            location: "",
        },
    });

    // Prefill from the interview every time the modal opens (the interview
    // may have moved since the last open).
    useEffect(() => {
        if (!isOpen) return;
        const start = utc_parts(interview.start_at);
        const end = interview.end_at ? new Date(interview.end_at) : null;
        const duration =
            end && interview.start_at
                ? String(
                      Math.max(
                          15,
                          Math.round(
                              (end.getTime() -
                                  new Date(interview.start_at).getTime()) /
                                  60000
                          )
                      )
                  )
                : "30";
        form.reset({
            date: start.date,
            time: start.time,
            duration,
            type: interview.type ?? "VIDEO",
            location: interview.locations ?? "",
        });
        setError(null);
    }, [isOpen, interview, form]);

    const handleReschedule = async (
        data: z.infer<typeof rescheduleSchema>
    ) => {
        setIsRescheduling(true);
        setError(null);

        // Times are stored in UTC; build the new slot the same way the
        // schedule modal does.
        const startDateTime = new Date(`${data.date}T${data.time}:00Z`);
        const endDateTime = new Date(
            startDateTime.getTime() + parseInt(data.duration || "30", 10) * 60000
        );

        try {
            await reschedule_interview_action({
                interviewId: interview.id,
                start_at: startDateTime,
                end_at: endDateTime,
                type: data.type,
                location: data.location,
            });
            setIsOpen(false);
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not reschedule the interview. Please try again."
            );
        } finally {
            setIsRescheduling(false);
        }
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) setError(null);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl uppercase">
                            Reschedule Interview
                        </DialogTitle>
                        <DialogDescription>
                            {interview.scheduling_provider === "calendly"
                                ? "Pick a new time. The Calendly booking is cancelled and re-booked at the new time, and the candidate is emailed the new details."
                                : "Pick a new time. The calendar event moves with it and the candidate is emailed the new time."}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleReschedule)}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="reschedule-date">Date</Label>
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <Input
                                            id="reschedule-date"
                                            type="date"
                                            {...field}
                                        />
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="reschedule-time">
                                    Time (UTC)
                                </Label>
                                <FormField
                                    control={form.control}
                                    name="time"
                                    render={({ field }) => (
                                        <Input
                                            id="reschedule-time"
                                            type="time"
                                            {...field}
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="reschedule-duration">
                                    Duration
                                </Label>
                                <FormField
                                    control={form.control}
                                    name="duration"
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger id="reschedule-duration">
                                                {field.value} minutes
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["15", "30", "45", "60", "90"].map(
                                                    (mins) => (
                                                        <SelectItem
                                                            key={mins}
                                                            value={mins}
                                                        >
                                                            {mins} minutes
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="reschedule-type">Type</Label>
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger id="reschedule-type">
                                                {field.value === "VIDEO"
                                                    ? "Video"
                                                    : field.value === "PHONE"
                                                      ? "Phone"
                                                      : "Onsite"}
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="VIDEO">
                                                    Video
                                                </SelectItem>
                                                <SelectItem value="PHONE">
                                                    Phone
                                                </SelectItem>
                                                <SelectItem value="ONSITE">
                                                    Onsite
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="reschedule-location">
                                Location / link
                            </Label>
                            <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <Input
                                        id="reschedule-location"
                                        placeholder="Office address or meeting link"
                                        {...field}
                                    />
                                )}
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isRescheduling}
                            className="w-full"
                        >
                            {isRescheduling && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            {isRescheduling
                                ? "Rescheduling…"
                                : "Reschedule interview"}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default RescheduleInterviewModal;
