// ─────────────────────────────────────────────────────────────────────────────
// Responsibilities:
//   1. Receive InstalledPlugin[] from the server (passed as a prop from layout)
//   2. Call initializePluginSystem() exactly once per session
//   3. Make flags available via context for feature-gating in child components
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { initializePluginSystem } from "@/lib/initialize-plugins";
import type { InstalledPlugin } from "../types";

// ── Context ───────────────────────────────────────────────────────────────────
interface PluginSystemContextValue {
    flags: Record<string, boolean>;
    ready: boolean;
    /** Check if a specific plugin is enabled for this org */
    isEnabled: (pluginId: string) => boolean;
}

const PluginSystemContext = createContext<PluginSystemContextValue>({
    flags: {},
    ready: false,
    isEnabled: () => false,
});

export function usePluginSystem(): PluginSystemContextValue {
    return useContext(PluginSystemContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────
interface PluginSystemProviderProps {
    installed: InstalledPlugin[];
    flags: Record<string, boolean>;
    children: React.ReactNode;
}

export function PluginSystemProvider({
    installed,
    flags,
    children,
}: PluginSystemProviderProps) {
    const [ready, setReady] = useState(false);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        initializePluginSystem(installed)
            .then(() => setReady(true))
            .catch((err) => {
                console.error("[PluginSystemProvider] Failed to initialize:", err);
                setReady(true); // still render — graceful degradation
            });
    }, []); // empty deps: run once, installed is stable from SSR

    const isEnabled = (pluginId: string) => flags[pluginId] === true;

    return (
        <PluginSystemContext.Provider value={{ flags, ready, isEnabled }}>
            {children}
        </PluginSystemContext.Provider>
    );
}
