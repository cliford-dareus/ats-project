"use client";

import { useState, useTransition } from "react";
import { Calendar, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirm_interview_hold_action,
  decline_interview_hold_action,
} from "@/server/actions/interview-actions";

type Details = {
  candidate_name: string | null;
  job_name: string | null;
  start_at: Date | string | null;
  end_at: Date | string | null;
  type: string | null;
  locations: string | null;
  hold_status: string | null;
  hold_expires_at: Date | string | null;
  expired: boolean;
};

function formatRange(start: Date | string | null, end: Date | string | null) {
  if (!start) return "Time TBD";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const date = s.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const st = s.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const et = e
    ? e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;
  return et ? `${date} · ${st} – ${et}` : `${date} · ${st}`;
}

const HoldResponseClient = ({
  token,
  details,
}: {
  token: string;
  details: Details;
}) => {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    kind: "confirmed" | "declined" | "error";
    message: string;
  } | null>(null);

  const disabled =
    pending ||
    details.expired ||
    details.hold_status !== "TENTATIVE" ||
    !!result;

  const onConfirm = () => {
    startTransition(async () => {
      const res = await confirm_interview_hold_action(token);
      if (res.success) {
        setResult({
          kind: "confirmed",
          message: res.already
            ? "This interview was already confirmed."
            : "You're confirmed. We locked the slot on the interviewer's calendar.",
        });
      } else {
        setResult({ kind: "error", message: res.error || "Something went wrong" });
      }
    });
  };

  const onDecline = () => {
    startTransition(async () => {
      const res = await decline_interview_hold_action(token);
      if (res.success) {
        setResult({
          kind: "declined",
          message: "Thanks for letting us know. The hold has been released.",
        });
      } else {
        setResult({ kind: "error", message: res.error || "Something went wrong" });
      }
    });
  };

  return (
    <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 overflow-hidden">
      <div className="bg-zinc-900 px-6 py-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Smart interview hold
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight">
          {details.job_name || "Interview"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Hi {details.candidate_name || "there"} — confirm to lock this slot.
        </p>
      </div>

      <div className="p-6 space-y-4">
        <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="size-4 text-zinc-400 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Proposed time
              </p>
              <p className="text-sm font-semibold text-zinc-900">
                {formatRange(details.start_at, details.end_at)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="size-4 text-zinc-400 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Type
              </p>
              <p className="text-sm font-semibold text-zinc-900">
                {details.type || "—"}
                {details.locations ? ` · ${details.locations}` : ""}
              </p>
            </div>
          </div>
          {details.hold_expires_at && (
            <p className="text-xs text-zinc-500">
              Hold expires{" "}
              {new Date(details.hold_expires_at).toLocaleString()}
            </p>
          )}
        </div>

        {details.expired && !result && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This hold has expired. Contact the recruiter for a new time.
          </div>
        )}

        {result && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm flex gap-2 ${
              result.kind === "confirmed"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : result.kind === "declined"
                  ? "border-zinc-200 bg-zinc-50 text-zinc-700"
                  : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {result.kind === "confirmed" ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            ) : result.kind === "declined" ? (
              <XCircle className="size-4 shrink-0 mt-0.5" />
            ) : null}
            {result.message}
          </div>
        )}

        {!result && details.hold_status === "TENTATIVE" && !details.expired && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={onConfirm}
              disabled={disabled}
              className="flex-1 rounded-xl h-11"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="size-4 mr-2" />
              )}
              Confirm interview
            </Button>
            <Button
              onClick={onDecline}
              disabled={disabled}
              variant="outline"
              className="flex-1 rounded-xl h-11"
            >
              Decline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HoldResponseClient;
