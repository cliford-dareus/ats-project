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
import {
  AlertCircle,
  Calendar,
  Clock,
  Command,
  Copy,
  Loader2,
  Lock,
  Send,
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
import { newInterviewSchema } from "@/zod";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

  const handleSchedule = async (
    data: z.infer<typeof interviewScheduleSchema>
  ) => {
    setIsScheduling(true);
    setError(null);
    setHoldLink(null);

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
        });

        setHoldLink(res.confirm_url);
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
        },
      });

      if (cal?.success) {
        const payload = {
          applicationId: application.id,
          job_id: application.job_id,
          start_at: startDateTime,
          end_at: endDateTime,
          link: cal?.meetLink ? cal.meetLink : undefined,
          location: "New York",
          status: "SCHEDULE",
          type: data.type,
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
          setHoldLink(null);
          setError(null);
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
                Interviewers' calendars are blocked. Send this link to the
                candidate — when they confirm, the event becomes final; if they
                decline or the hold expires, the slot is released.
              </p>
            </div>
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
                    Tentative calendar block until candidate confirms
                  </p>
                </div>
                <FormField
                  name="use_hold"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      id="use_hold"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

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
                      Start Time
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

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
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
                  disabled={isScheduling}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isScheduling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {useHold ? "Holding…" : "Scheduling…"}
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
