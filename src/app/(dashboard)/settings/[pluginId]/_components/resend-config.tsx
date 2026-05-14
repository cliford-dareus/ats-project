"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { useEffect, useState } from "react";

interface ResendConfigProps {
    onSave: (settings: any) => void;
    settings: any;
}

const ResendConfig = ({ onSave, settings }: ResendConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState("resend");
    const [key, setKey] = useState("");

    useEffect(() => {
        if (settings?.apiKey) {
            setKey(settings.apiKey);
        }
    }, [settings]);

    const handleConnect = async () => {
        try {
            await authenticate("resend", { apiKey: key });
            // auth.status is now "authenticated" — badge updates automatically
            // because authenticate() calls pluginRegistry.stateManager.setState()
            // which triggers useSyncExternalStore re-renders everywhere
        } catch (e) {
            // auth.status is now "error", auth.error has the message
        }
    };

    return (
        <div className="space-y-6">
            <Input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-..."
            />
            <Button
                onClick={handleConnect}
                disabled={auth.status === "authenticating"}
            >
                {auth.status === "authenticating" ? "Connecting…" : "Connect"}
            </Button>
        </div>
    )
};

export default ResendConfig;
