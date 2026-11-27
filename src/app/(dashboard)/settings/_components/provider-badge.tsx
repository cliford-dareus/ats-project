"use client";

import { useProviderAuthState } from "@/hooks/use-plugin-registry";
import { CheckCircle2 } from "lucide-react";

// Honest auth states. The client registry only ever holds a MASKED stored
// key, so a saved key must never render as "Online": providers are
// "unauthenticated" on every fresh load until the key is verified this
// session (via Connect in the plugin's settings page), even though
// server-side dispatch with the stored key still works.
export function ProviderBadge({
    providerId,
    hasSavedKey = false,
    active = true,
}: {
    providerId: string;
    /** A masked stored key exists (•••• + last 4) — configured, not verified. */
    hasSavedKey?: boolean;
    /** The plugin's stored active flag — an inactive plugin is Disabled. */
    active?: boolean;
}) {
    const auth = useProviderAuthState(providerId);

    const colors = {
        authenticated: "bg-green-500",
        authenticating: "bg-yellow-500 animate-pulse",
        unauthenticated: "bg-muted-foreground/50",
        error: "bg-red-500",
    };

    if (auth.status === "authenticating") {
        return (
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${colors[auth.status]}`} />
                <span className="text-yellow-500">Verifying…</span>
            </div>
        );
    }

    if (auth.status === "error") {
        return (
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${colors[auth.status]}`} />
                <span className="text-red-500">Connection failed</span>
            </div>
        );
    }

    if (auth.status === "authenticated") {
        return (
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${colors[auth.status]}`} />
                <span className="text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected this session
                </span>
            </div>
        );
    }

    // Unauthenticated from here on: the key was never verified this session.
    if (!active) {
        return (
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${colors[auth.status]}`} />
                <span className="text-muted-foreground">Disabled</span>
            </div>
        );
    }

    if (hasSavedKey) {
        return (
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-500">Saved · not verified this session</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colors[auth.status]}`} />
            <span className="text-blue-500">Not configured</span>
        </div>
    );
}
