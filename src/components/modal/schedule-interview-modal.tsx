"use client";

import React, { useState } from "react";
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
import { AlertCircle, Calendar, Clock, Command, Loader2, Send } from "lucide-react";
// import { Calendar } from "@/components/ui/calendar";
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
import { create_interview_action } from "@/server/actions/interview-actions";
import { newInterviewSchema } from "@/zod";

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
    const form = useForm<z.infer<typeof interviewScheduleSchema>>({
        resolver: zodResolver(interviewScheduleSchema),
        defaultValues: {
            date: "",
            time: "",
            duration: "",
            type: "ONSITE",
        },
    });

    const handleSchedule = async (
        data: z.infer<typeof interviewScheduleSchema>,
    ) => {
        setIsScheduling(true);
        setError(null);

        const startDateTime = new Date(
            `${data.date}T${data.time}:00Z`,
        ).toISOString();
        const endDateTime = new Date(
            new Date(startDateTime).getTime() + parseInt(data.duration) * 60000,
        ).toISOString();

        try {
            const candidateName =
                "candidate" in application
                    ? application.candidate.name
                    : application.candidate_name;
            const candidateEmail =
                "candidate" in application
                    ? application.candidate.email
                    : application.candidate_email;

            const payload = {
                summary: `Interview: ${candidateName} for ${jobDetails.jobName}`,
                description: `Interview with ${candidateName} for the ${jobDetails.jobName} position in ${jobDetails.department}.`,
                startDateTime,
                endDateTime,
                attendeeEmail: candidateEmail,
            };

            const res = await createCalendarEvent({
                clerkUserId: user?.id as string,
                payload,
            });

            if (res?.success) {
                const payload = {
                    applicationId: application.id,
                    job_id: application.job_id,
                    start_at: new Date(startDateTime),
                    end_at: new Date(endDateTime),
                    link: res?.meetLink ? res.meetLink : undefined,
                    location: "New York",
                    status: "SCHEDULE",
                    type: data.type
                } as z.infer<typeof newInterviewSchema>;

                await create_interview_action(payload);

                setIsOpen(false);
            } else {
                setError(res.error || 'Failed to schedule interview');
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Command />
                    </div>
                    <div className="">
                        <DialogTitle className="text-2xl uppercase">
                            Schedule Interview
                        </DialogTitle>
                        <DialogDescription>
                            Complete each step to schedule an interview!
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSchedule)}
                        className="space-y-4"
                    >
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Interview Date
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <FormField
                                        name="date"
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                type="date"
                                                required
                                                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                            />
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                        Start Time
                                    </label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                        <FormField
                                            name="time"
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    type="time"
                                                    required
                                                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                                />
                                            )}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                        Duration
                                    </label>
                                    <FormField
                                        name="duration"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger>{field.value}</SelectTrigger>
                                                <SelectContent className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all">
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
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger>{field.value}</SelectTrigger>
                                                <SelectContent className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all">
                                                    <SelectItem value="ONSITE">In-Person</SelectItem>
                                                    <SelectItem value="VIDEO">Video</SelectItem>
                                                    <SelectItem value="PHONE">Phone</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-xs">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="flex-1 py-3 bg-zinc-50 text-zinc-600 rounded-xl font-bold hover:bg-zinc-100 transition-all"
                            >
                                Cancel
                            </button>
                            <Button
                                type="submit"
                                disabled={isScheduling}
                                className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isScheduling ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Scheduling...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Schedule
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default ScheduleInterviewModal;
