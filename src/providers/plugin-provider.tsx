'use client';

import React, { createContext, useContext, useState } from 'react';

type Plugins = string[];

const PluginContext = createContext<Plugins>([]);

export function PluginProvider({ children, initialPlugins }: {
    children: React.ReactNode;
    initialPlugins: Plugins
}) {
    const [plugins] = useState(initialPlugins);
    return <PluginContext.Provider value={plugins}>{children}</PluginContext.Provider>;
};

export function usePlugin(key: string) {
    return useContext(PluginContext).includes(key);
};
