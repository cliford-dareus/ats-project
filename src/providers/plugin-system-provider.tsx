// ─────────────────────────────────────────────────────────────────────────────
// Responsibilities:
//   1. Receive InstalledPlugin[] from the server (passed as a prop from layout)
//   2. Re-run initializePluginSystem() whenever `installed` changes
//      (e.g. after router.refresh() following an install / toggle / save)
//      — the old empty-deps effect ran once per session, so the client
//      registry and auth state stayed stale until a full reload.
//      initializePluginSystem() unregisters removed providers and
//      register() overwrites re-registered ones (de-indexing first), so
//      re-runs are safe.
//   3. Make flags available via context for feature-gating in child components
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { initializePluginSystem } from "@/lib/initialize-plugins";
import type { InstalledPlugin } from "@/types";

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

    useEffect(() => {
        let cancelled = false;

        initializePluginSystem(installed)
            .then(() => {
                if (!cancelled) setReady(true);
            })
            .catch((err) => {
                console.error("[PluginSystemProvider] Failed to initialize:", err);
                if (!cancelled) setReady(true); // still render — graceful degradation
            });

        return () => {
            cancelled = true;
        };
    }, [installed]);

    const isEnabled = (pluginId: string) => flags[pluginId] === true;

    return (
        <PluginSystemContext.Provider value={{ flags, ready, isEnabled }}>
            {children}
        </PluginSystemContext.Provider>
    );
}
