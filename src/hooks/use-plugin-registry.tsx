// ─────────────────────────────────────────────────────────────────────────────
// Client-side hooks for consuming the ATSPluginRegistry singleton.
// Uses useSyncExternalStore — safe for React 18 concurrent rendering.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useSyncExternalStore, useCallback, useRef } from "react";
import { pluginRegistry } from "@/lib/plugin-registry";
import type { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import type { ATSContext, AutomationRule, FiredTrigger, PluginAuthState, TriggerEvent } from "../types";
import { automationEngine } from "@/lib/automation-engine";

// Stable server-side fallback — same reference every call, never triggers
// a useSyncExternalStore "changed" detection on the server snapshot.
const UNAUTHENTICATED: PluginAuthState = { status: "unauthenticated" };
const EMPTY_INTEGRATIONS: ATSIntegration[] = [];
const EMPTY_PROVIDERS: ATSPluginProvider[] = [];


// ── Auth state for a single provider ─────────────────────────────────────────
// Zed equivalent: cx.observe(&state, |_, cx| { cx.notify() })
export function useProviderAuthState(providerId: string): PluginAuthState {
    return useSyncExternalStore(
        (cb) => pluginRegistry.stateManager.subscribe(cb),
        () => pluginRegistry.stateManager.getState(providerId),
        () => UNAUTHENTICATED,   // server snapshot — stable reference
    );
}

// ── All providers ─────────────────────────────────────────────────────────────
export function useAllProviders(): ATSPluginProvider[] {
    const snapshotRef = useRef<ATSPluginProvider[]>(EMPTY_PROVIDERS);

    const getSnapshot = useCallback((): ATSPluginProvider[] => {
        const next = pluginRegistry.getAllProviders();
        const prev = snapshotRef.current;

        // Same length + same ids in same order → return the previous reference
        // so React's Object.is() check sees no change and skips the re-render.
        const stable =
            next.length === prev.length &&
            next.every((p, i) => p.id === prev[i].id);

        if (!stable) snapshotRef.current = next;
        return snapshotRef.current;
    }, []);

    return useSyncExternalStore(
        (cb) => pluginRegistry.stateManager.subscribe(cb),
        getSnapshot,
        () => EMPTY_PROVIDERS,
    );
}

// ── Installed integrations for a provider ─────────────────────────────
// Zed equivalent: cx.observe(&state, |_, cx| { cx.notify() })
export function useInstalledIntegrations(): ATSIntegration[] {
    const snapshotRef = useRef<ATSIntegration[]>(EMPTY_INTEGRATIONS);

    const getSnapshot = useCallback((): ATSIntegration[] => {
        const next = pluginRegistry.getInstalledIntegrations();
        const prev = snapshotRef.current;

        const stable =
            next.length === prev.length &&
            next.every((intg, i) => intg.id === prev[i].id);

        if (!stable) snapshotRef.current = next;
        return snapshotRef.current;
    }, []);

    return useSyncExternalStore(
        (cb) => pluginRegistry.stateManager.subscribe(cb),
        getSnapshot,
        () => EMPTY_INTEGRATIONS,
    );
}

// ── Dispatch hook — fires the registry and returns fired triggers ─────────────
export function useDispatch() {
    return useCallback(
        async (event: TriggerEvent, context: ATSContext): Promise<FiredTrigger[]> => {
            return pluginRegistry.dispatch(event, context);
        },
        []
    );
}

// ── Authenticate a provider ────────────────────────────────────────────────────
export function useAuthenticateProvider() {
    return useCallback(
        async (providerId: string, credentials: Record<string, string>) => {
            const provider = pluginRegistry.getProvider(providerId);
            if (!provider) throw new Error(`Provider "${providerId}" not registered`);
            await provider.authenticate(credentials);
        },
        []
    );
};

// ── Automation rules for a job ─────────────────────────────────────────────
export function useRules(jobId: number): AutomationRule[] {
    const subscribe = useCallback(
        (cb: () => void) => automationEngine.subscribe(jobId, cb),
        [jobId]
    );

    const getSnapshot = useCallback(
        () => automationEngine.getRulesForJob(jobId),
        [jobId]
    );

    return useSyncExternalStore(subscribe, getSnapshot, () => []);
}
