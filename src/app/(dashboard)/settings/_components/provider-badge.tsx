"use client";

import { useProviderAuthState } from "@/hooks/use-plugin-registry";
import { CheckCircle2 } from "lucide-react";

export function ProviderBadge({ providerId }: { providerId: string }) {
    const auth = useProviderAuthState(providerId);
    console.count(`useProviderAuthState(${auth}) rendered`);

    const colors = {
        authenticated: "bg-green-500",
        authenticating: "bg-yellow-500 animate-pulse",
        unauthenticated: "bg-gray-500",
        error: "bg-red-500",
    };

    return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colors[auth.status]}`} />
            {auth.status === 'unauthenticated' ? (
                <span className="text-blue-500">Action Required</span>
            ) : (
                <span className="text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Online
                </span>
            )}
        </div>
    );
}
