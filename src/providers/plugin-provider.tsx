'use client';

import { createContext, useContext, useState } from 'react';

type Plugins = Record<string, boolean>;

const PluginContext = createContext<Plugins>({});

export function PluginProvider({ children, initialPlugins }: {
    children: React.ReactNode;
    initialPlugins: Plugins
}) {
    const [plugins, setPlugins] = useState(initialPlugins);

    // Optional: live updates via WebSocket / polling in real SaaS
    return <PluginContext.Provider value={plugins}>{children}</PluginContext.Provider>;
};

export function usePlugin(key: string) {
    return useContext(PluginContext)[key] ?? false;
};