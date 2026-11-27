"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { resend_portal_link_action } from "@/server/actions/portal-actions";
import { cn } from "@/lib/utils";

/**
 * Recruiter control on the application detail page. Sends the candidate a
 * fresh portal link (invalidating the previous one) via
 * resend_portal_link_action. It shows only what the action result says —
 * no extra query for token existence. Permission gating lives in the
 * parent (application header, `candidate:edit` — the same permission it
 * already uses for candidate actions); this component only takes a
 * `disabled` prop.
 */
const ResendPortalLinkButton = ({
    applicationId,
    disabled,
}: {
    applicationId: number;
    disabled?: boolean;
}) => {
    const [message, setMessage] = useState<{
        kind: "success" | "error";
        text: string;
    } | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        setMessage(null);
        startTransition(async () => {
            try {
                const result = await resend_portal_link_action(applicationId);
                if (result?.success) {
                    setMessage({
                        kind: "success",
                        text: result.message ?? "Portal link sent to the candidate.",
                    });
                } else {
                    setMessage({
                        kind: "error",
                        text: result?.message ?? "Could not send the portal link. Please try again.",
                    });
                }
            } catch (err) {
                setMessage({
                    kind: "error",
                    text: (err as Error).message || "Could not send the portal link. Please try again.",
                });
            }
        });
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled || isPending}
                title="Sends a new portal link to the candidate and invalidates the previous link"
                className="px-4 !py-2 border border-border rounded-lg text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:bg-muted transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Mail size={14} />
                {isPending ? "Sending…" : "Resend portal link"}
            </button>
            {message && (
                <p
                    className={cn(
                        "flex items-start gap-1 text-xs max-w-60 text-right",
                        message.kind === "success" ? "text-green-600" : "text-red-600",
                    )}
                >
                    {message.kind === "success" ? (
                        <CheckCircle size={14} className="mt-0.5 shrink-0" />
                    ) : (
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    )}
                    {message.text}
                </p>
            )}
        </div>
    );
};

export default ResendPortalLinkButton;
