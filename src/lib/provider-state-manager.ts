// ─────────────────────────────────────────────────────────────────────────────
// EventEmitter + React's useSyncExternalStore pattern
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from "events";
import type { PluginAuthState } from "../types";

const UNAUTHENTICATED: PluginAuthState = { status: "unauthenticated" };

export class ProviderStateManager extends EventEmitter {
    private states = new Map<string, PluginAuthState>();

    getState(providerId: string): PluginAuthState {
        return this.states.get(providerId) ?? UNAUTHENTICATED;
    }

    setState(providerId: string, state: PluginAuthState): void {
        const prev = this.states.get(providerId);
        // Skip the emit if nothing actually changed (same reference = no change).
        if (prev === state) return;
        this.states.set(providerId, state);
        this.emit("change", providerId, state);
    }

    private isEqual(a: PluginAuthState | undefined, b: PluginAuthState): boolean {
        if (!a) return false;
        return a.status === b.status &&
            a.token === b.token &&
            a.userId === b.userId &&
            a.error === b.error; // add other fields as needed
    }

    getAllStates(): ReadonlyMap<string, PluginAuthState> {
        return this.states;
    }

    /** React-compatible subscribe() for useSyncExternalStore */
    subscribe(callback: () => void): () => void {
        this.on("change", callback);
        return () => this.off("change", callback);
    }

    clearState(providerId: string): void {
        if (this.states.has(providerId)) {
            this.states.delete(providerId);
            this.emit("change", providerId, { status: "unauthenticated" });
        }
    }
}
