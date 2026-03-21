'use client'

import React, {useState} from 'react';
import {useUser} from "@clerk/nextjs";
import {createCalendarEvent} from "@/server/google-calenda";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {AlertCircle, Clock, Command, Loader2, Send} from "lucide-react";
import {Calendar} from "@/components/ui/calendar";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form, FormField} from "@/components/ui/form";
import {useForm} from "react-hook-form";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger} from "@/components/ui/select";
import {ApplicationType} from "@/types";

type Props = {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    application: ApplicationType;
    jobDetails: {jobName: string, department: string}
};

export const interviewScheduleSchema = z.object({
    date: z.string(),
    time: z.string(),
    duration: z.string()
})

const ScheduleInterviewModal = ({isOpen, setIsOpen, application, jobDetails}: Props) => {
    const {user} = useUser();
    const [isScheduling, setIsScheduling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<z.infer<typeof interviewScheduleSchema>>({
        resolver: zodResolver(interviewScheduleSchema),
        defaultValues: {
            date: '',
            time: '',
            duration: ''
        }
    });

    const handleSchedule = async (data: z.infer<typeof interviewScheduleSchema>) => {
        setIsScheduling(true);
        setError(null);

        const startDateTime = new Date(`${data.date}T${data.time}:00Z`).toISOString();
        const endDateTime = new Date(new Date(startDateTime).getTime() + parseInt(data.duration) * 60000).toISOString();

        try {
            const payload = {
                summary: `Interview: ${application?.candidate.name} for ${jobDetails.jobName}`,
                description: `Interview with ${application?.candidate.name} for the ${jobDetails.jobName} position in ${jobDetails.department}.`,
                startDateTime,
                endDateTime,
                attendeeEmail: application?.candidate.email,
            }

            const res = await createCalendarEvent({
                clerkUserId: user?.id,
                payload
            });

            console.log(res)

            // const data = await res.json();
            // if (data.success) {
            //     onScheduled({
            //         id: data.event.id,
            //         date,
            //         time,
            //         type: 'Video',
            //         status: 'Scheduled',
            //         link: data.meetLink,
            //     });
            //
            //     setIsOpen(false);
            // } else {
            //     setError(data.error || 'Failed to schedule interview');
            // }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            setError('An error occurred while scheduling');
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div
                        className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Command/>
                    </div>
                    <div className="">
                        <DialogTitle className="text-2xl uppercase">Edit Job</DialogTitle>
                        <DialogDescription>Complete each step to create a candidate!</DialogDescription>
                    </div>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSchedule)} className="space-y-4">
                        <div className="space-y-4">
                            <div>
                                <label
                                    className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Interview Date
                                </label>
                                <div className="relative">
                                    <Calendar
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"/>
                                    <FormField
                                        name='date'
                                        render={({field}) => (
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
                                    <label
                                        className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                        Start Time
                                    </label>
                                    <div className="relative">
                                        <Clock
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"/>
                                        <FormField
                                            name="time"
                                            render={({field}) => (
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
                                    <label
                                        className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                                        Duration
                                    </label>
                                    <FormField
                                        name="duration"
                                        render={({field}) => (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger>{field.value}</SelectTrigger>
                                                <SelectContent
                                                     className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                                >
                                                    <SelectItem value="15">15 Minutes</SelectItem>
                                                    <SelectItem value="30">30 Minutes</SelectItem>
                                                    <SelectItem value="45">45 Minutes</SelectItem>
                                                    <SelectItem value="60">1 Hour</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div
                                className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-xs">
                                <AlertCircle className="w-4 h-4 flex-shrink-0"/>
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
                                        <Loader2 className="w-4 h-4 animate-spin"/>
                                        Scheduling...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4"/>
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
