'use client';

import React, {createContext, useContext, useState, useCallback, useEffect, Dispatch, SetStateAction} from 'react';
import {StageTrigger, TriggerAction} from '@/plugins/smart-trigger/types';
import {addTaskToQueue} from '@/server/queries/mongo/smart-task';
import {getJobListingsStagesAction} from '@/server/actions/job-listings-actions';
import {StageResponseType} from '@/types';

const PluginsContext = createContext<PluginsContextType>({
    jobId: null,
    jobStages: [],
    setJobId: () => {},
    triggers: [],
    setTriggers: () => {},
    onTriggerActivated: async () => {},
});

type PluginsContextType = {
    jobId: string | null;
    setJobId: Dispatch<SetStateAction<string | null>>;
    jobStages: StageResponseType[];
    triggers: StageTrigger[];
    setTriggers: Dispatch<SetStateAction<StageTrigger[]>>;
    onTriggerActivated: (applicationId: number, stageId: number, stageName: string) => Promise<void>;
};

export const PluginsProvider = ({children}: { children: React.ReactNode }) => {
    // Setup for smart-trigger
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStages, setJobStages] = useState<StageResponseType[]>([]);

    // Plugins config data specific to each job or application
    const [triggers, setTriggers] = useState<StageTrigger[]>([]);
    // const [jobBoard, setJobBoard] = useState<any[]>([]);
    // const [analytics, setAnalytics] = useState<any[]>([]);


    const processTriggerActions = async (
        applicationId: number,
        stageTriggers: StageTrigger[],
        stageName: string
    ) => {
        for (const trigger of stageTriggers) {
            for (const action of trigger.actions) {
                if (action.action_type === null) continue;
                await addTaskToQueue(applicationId, action, stageName);
            }
        }
    };

    const parseTriggerResponse = (stageData: StageResponseType): StageTrigger => {
        try {
            return {
                id: String(stageData.id),
                stage: stageData.stage_name,
                actions: JSON.parse(stageData.trigger) as TriggerAction[]
            };
        } catch (error) {
            console.error(`Failed to parse trigger for stage ${stageData.id}:`, error);
            return {
                id: String(stageData.id),
                stage: stageData.stage_name,
                actions: []
            };
        }
    };

    const onTriggerActivated = useCallback(
        async (applicationId: number, stageId: number, stageName: string) => {
            const stageTriggers = triggers.filter((t) => Number(t.id) === stageId);
            await processTriggerActions(applicationId, stageTriggers, stageName);
        },
        [triggers]
    );

    useEffect(() => {
        if (!jobId) return;
        const fetchStagesAndTriggers = async () => {
            try {
                const stagesData = await getJobListingsStagesAction(Number(jobId));
                const validStagesData = Array.isArray(stagesData) ? stagesData : [];
                const parsedTriggers = validStagesData.map(parseTriggerResponse);
                
                setJobStages(validStagesData);
                setTriggers(parsedTriggers);
            } catch (error) {
                console.error('Failed to fetch stages and triggers:', error);
            }
        };

        fetchStagesAndTriggers();
    }, [jobId]);

    const contextValue: PluginsContextType = {
        jobId,
        setJobId,
        jobStages,
        triggers,
        setTriggers,
        onTriggerActivated
    };

    return (
        <PluginsContext.Provider value={contextValue}>
            {children}
        </PluginsContext.Provider>
    );
};

export const usePluginContextHook = () => useContext(PluginsContext);
