// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth. Routes TriggerEvents → ATSIntegrations.
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from "events";
import { ProviderStateManager } from "./provider-state-manager";
import type { ATSPluginProvider, ATSIntegration } from "./plugin-interfaces";
import type {
    ATSContext,
    // ATSIntegrationResult,
    FiredTrigger,
    // InstalledPlugin,
    PluginCapability,
    TriggerEvent,
    TriggerEventType,
} from "../types";

export class ATSPluginRegistry extends EventEmitter {
    private providers = new Map<string, ATSPluginProvider>();
    // eventType → Set<"providerId:integrationId">
    private triggerIndex = new Map<TriggerEventType, Set<string>>();
    public stateManager = new ProviderStateManager();

    // ── Registration ──────────────────────────────────────────────────────────
    register(provider: ATSPluginProvider): void {
        if (this.providers.has(provider.id)) {
            // Overwrite — useful when org re-authenticates a provider
            this._removeFromIndex(provider.id);
        }
        this.providers.set(provider.id, provider);
        this._indexProvider(provider);
        this.stateManager.setState(provider.id, provider.getAuthState());
        this.emit("provider:registered", provider.id);
    }

    unregister(providerId: string): void {
        this._removeFromIndex(providerId);
        this.providers.delete(providerId);
        this.emit("provider:unregistered", providerId);
    }

    private _indexProvider(provider: ATSPluginProvider): void {
        for (const integration of provider.getIntegrations()) {
            for (const trigger of integration.getSupportedTriggers()) {
                for (const eventType of trigger.on) {
                    if (!this.triggerIndex.has(eventType)) {
                        this.triggerIndex.set(eventType, new Set());
                    }
                    this.triggerIndex
                        .get(eventType)!
                        .add(`${provider.id}:${integration.id}`);
                }
            }
        }
    }

    private _removeFromIndex(providerId: string): void {
        for (const [eventType, keys] of this.triggerIndex.entries()) {
            for (const key of keys) {
                if (key.startsWith(`${providerId}:`)) keys.delete(key);
            }
            if (keys.size === 0) this.triggerIndex.delete(eventType);
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────
    getProvider(id: string): ATSPluginProvider | undefined {
        return this.providers.get(id);
    }

    getAllProviders(): ATSPluginProvider[] {
        return Array.from(this.providers.values());
    }

    getProvidersByCapability(cap: PluginCapability): ATSPluginProvider[] {
        return this.getAllProviders().filter((p) => p.capabilities.includes(cap));
    }

    getIntegration(
        providerId: string,
        integrationId: string
    ): ATSIntegration | undefined {
        return this.providers
            .get(providerId)
            ?.getIntegrations()
            .find((i) => i.id === integrationId);
    }

    getInstalledIntegrations(): ATSIntegration[] {
        return this.getAllProviders().flatMap((p) => p.getIntegrations());
    }

    isInitialized(): boolean {
        return this.providers.size > 0;
    }

    // ── Smart Trigger Dispatch ────────────────────────────────────────────────
    // Returns rich FiredTrigger[] so the UI can render toasts + activity log.
    async dispatch(
        event: TriggerEvent,
        context: ATSContext
    ): Promise<FiredTrigger[]> {
        const keys = this.triggerIndex.get(event.type) ?? new Set<string>();
        const fired: FiredTrigger[] = [];

        const tasks = Array.from(keys).map(async (key) => {
            const [providerId, integrationId] = key.split(":");

            const provider = this.providers.get(providerId);
            const integration = provider
                ?.getIntegrations()
                .find((i) => i.id === integrationId);

            if (!provider || !integration) return;

            // Skip if provider not authenticated
            const auth = this.stateManager.getState(providerId);
            if (auth.status !== "authenticated") {
                console.warn(`[Registry] Skipping ${key}: not authenticated`);
                return;
            }

            // Evaluate trigger conditions
            for (const trigger of integration.getSupportedTriggers()) {
                if (!trigger.on.includes(event.type)) continue;
                if (trigger.condition) {
                    const pass = await trigger.condition(event, context);
                    if (!pass) continue;
                }


                try {
                    console.log(`[Registry] Integration ${event.type} completed`);
                    const result = await integration.execute(event, context);
                    console.log(`[Registry] Dispatching ${event.type} to ${integration.id}`);
                    const entry: FiredTrigger = {
                        integrationId: integration.id,
                        integrationName: integration.name,
                        icon: integration.icon,
                        provider: provider.name,
                        providerColor: provider.providerColor ?? "#6b7280",
                        candidateName: context.candidate?.name ?? "Unknown",
                        result,
                        at: new Date(),
                    };
                    fired.push(entry);
                    this.emit("integration:executed", entry);
                } catch (err) {
                    const error = err instanceof Error ? err.message : String(err);
                    this.emit("integration:error", { key, event, error });
                }
            }
        });

        await Promise.allSettled(tasks);
        return fired;
    }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
// Module-level — shared across the entire client bundle automatically.
// Zed equivalent: GlobalLanguageModelRegistry

export const pluginRegistry = new ATSPluginRegistry();
