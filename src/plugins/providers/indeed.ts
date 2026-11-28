// Provider: Indeed  ·  0 live integrations
//
// Indeed syndication is FEED-BASED, not API-based: there is no Indeed API
// key, no OAuth, and nothing to dispatch. Publishing a job writes a
// `job_syndication` row (status 'syndicated'); the org's public XML feed
// (src/app/(public)/[domain]/jobs.xml/route.ts) then includes that job
// automatically, and Indeed crawls the feed on its own schedule. The
// provider therefore exists so Indeed can be installed/enabled like any
// other plugin (flags, settings page, factory) — it exposes no
// integrations, and auth is honest about that:
//
//   • getAuthState() returns "authenticated" whenever the plugin is
//     installed, because there is nothing to authenticate against —
//     "unauthenticated" would wrongly imply a missing key.
//   • authenticate()/deauthenticate() are no-ops: there are no
//     credentials to store or revoke. They are documented as such so a
//     future reader doesn't "fix" them into a fake credential flow.

import { pluginRegistry } from "@/lib/plugin-registry";
import type { ATSPluginProvider } from "@/lib/plugin-interfaces";
import type { InstalledPlugin, PluginAuthState, PluginCapability } from "@/types";

export class IndeedProvider implements ATSPluginProvider {
    readonly id = "indeed";
    readonly name = "Indeed";
    readonly description = "Publishes open roles to Indeed through your public XML feed — no API key needed.";
    readonly capabilities: PluginCapability[] = ["syndication"];
    readonly providerColor = "#2557a7";

    // Feed-based: installed == authenticated. There is no key to hold,
    // so nothing here can ever leak a credential.
    private authState: PluginAuthState = { status: "authenticated" };

    constructor(_installed: InstalledPlugin) {
        // The constructor takes the installed plugin for the factory
        // signature only — Indeed needs no credentials or config from it.
        // (The Indeed account email, used for the feed's <email> element,
        // lives in settings.config.indeedAccountEmail and is read by the
        // feed builder, not by this provider.)
    }

    getAuthState(): PluginAuthState {
        return this.authState;
    }

    async authenticate(_credentials: Record<string, string>): Promise<void> {
        // No-op by design: Indeed syndication has no credentials to
        // verify. The provider is authenticated by being installed.
        this.authState = { status: "authenticated" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
    }

    async deauthenticate(): Promise<void> {
        // No-op by design: there is no session or token to revoke.
        // Uninstalling/disabling the plugin removes the provider from
        // the registry instead — see initializePluginSystem.
        this.authState = { status: "authenticated" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
    }

    getIntegrations(): [] {
        // No dispatch integrations: Indeed never receives a push from
        // this system. Jobs reach Indeed only via the public XML feed.
        return [];
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export const createIndeedProvider = (installed: InstalledPlugin) =>
    new IndeedProvider(installed);
