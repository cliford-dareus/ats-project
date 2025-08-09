'use client';

import React, {createContext, useContext, useState, useCallback, useEffect, Dispatch, SetStateAction} from 'react';
import {StageTrigger, TriggerTask} from '@/plugins/smart-trigger/types';
import {StageResponseType} from '@/types';
import {get_all_tasks_action} from "@/server/actions/application_actions";
import {fetchPlugins, getPlugins, pluginRegistry} from '@/lib/plugins-registry';
import { RANGE_OPTIONS } from '@/lib/utils';

const PluginsContext = createContext<PluginsContextType>({
    orgId: null,
    chartRange: RANGE_OPTIONS.last_7_days,
    jobId: null,
    tasks: [],
    analytics: {},
    jobStages: [],
    setJobStages: () => {},
    setJobId: () => {},
    triggers: [],
    setTriggers: () => {},
    fetchApplicationTasks: async () => {},
    setAnalytics: () => {},
    setOrgId: () => {},
});

type PluginsContextType = {
    orgId: string | null;
    chartRange: {startDate: Date | null, endDate: Date | null};
    jobId: string | null;
    tasks: TriggerTask[];
    analytics: {};
    setJobId: Dispatch<SetStateAction<string | null>>;
    jobStages: StageResponseType[];
    setJobStages: Dispatch<SetStateAction<StageResponseType[]>>;
    triggers: StageTrigger[];
    setTriggers: Dispatch<SetStateAction<StageTrigger[]>>;
    fetchApplicationTasks: () => Promise<void>;
    setAnalytics: Dispatch<SetStateAction<{}>>;
    setOrgId: Dispatch<SetStateAction<string | null>>;
};

type TriggerPayloadType = {
    applicationId: number;
    stageId: number;
    stageName: string;
};

export const PluginsProvider = ({children, orgId}: { children: React.ReactNode, orgId: string }) => {
    const [orgIdState, setOrgIdState] = useState<string | null>(orgId);
    const [plugins, setPlugins] = useState(getPlugins());
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStages, setJobStages] = useState<StageResponseType[]>([]);

    // Plugins config data specific to each job or application
    //SMART TRIGGERS
    const [tasks, setTasks] = useState<TriggerTask[]>([]);
    const [triggers, setTriggers] = useState<StageTrigger[]>([]);
    //EXTERNAL JOB BOARD
    const [jobBoard, setJobBoard] = useState<any[]>([]);
    //ANALYTICS
    const [chartRange, setChartRange] = useState<any>(RANGE_OPTIONS.last_7_days);
    const [analytics, setAnalytics] = useState<{}>({});

    const fetchApplicationTasks = useCallback(
        async () => {
            const tasks = await get_all_tasks_action();
            const parsedTasks = JSON.parse(tasks as string) as {tasks: TriggerTask[]};
            setTasks(parsedTasks.tasks);
        },
        []
    );

     const contextValue: PluginsContextType = {
        orgId: orgIdState,
        chartRange,
        tasks,
        jobId,
        setJobId,
        jobStages,
        analytics,
        setJobStages,
        triggers,
        setTriggers,
        fetchApplicationTasks,
        setAnalytics,
        setOrgId: setOrgIdState,
    };

    useEffect(() => {
        if (!orgIdState) return;
        fetchPlugins(orgIdState).then((plugins) => {
            setPlugins(plugins);
        });
    }, [orgIdState]);

    useEffect(() => {
        Array.from(pluginRegistry.entries()).forEach(([id, state]) => {
            if (state.enabled && state.config.actions?.activate) {
                state.config.actions.activate(contextValue);
            }
        })
    }, [plugins]);

    return (
        <PluginsContext.Provider value={contextValue}>
            {children}
        </PluginsContext.Provider>
    );
};

export const usePluginContextHook = () => useContext(PluginsContext);
