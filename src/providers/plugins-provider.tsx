'use client'

import {createContext, useContext, useEffect, useState} from 'react';

type PluginContextType = {
    activePlugins: string[];
    isPluginActive: (pluginId: string) => boolean;
};

const PluginContext = createContext<PluginContextType>({
    activePlugins: [],
    isPluginActive: () => false
});

type Props = {
    orgId: string;
    children: React.ReactNode;
};

export const PluginProvider = ({ children, orgId }:Props) => {
    const [activePlugins, setActivePlugins] = useState<string[]>([]);

    useEffect(() => {
        const f = async () => {
            const data = await fetch(`/api/plugins/?orgId=${orgId}`)
            const json = await data.json();
            setActivePlugins(json.enabled);
        };

        f();
    }, [orgId]);

    return (
        <PluginContext.Provider value={{
            activePlugins,
            isPluginActive: (pluginId) => activePlugins.includes(pluginId)
        }}>
            {children}
        </PluginContext.Provider>
    );
};

export const usePlugin = () => useContext(PluginContext);
