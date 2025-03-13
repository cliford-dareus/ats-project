'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { StageTrigger, TriggerAction, TriggerTask } from '@/plugins/smart-trigger/types';
import { addTaskToQueue, getTasks } from '@/server/queries/mongo/smart-task';
import { getJobListingsStagesAction } from "@/server/actions/job-listings-actions";
import {StageResponseType} from "@/types";

type TriggerContextType = {
    tasks: TriggerTask[];
    triggers: StageTrigger[];
    stages: StageResponseType[];
    initializeTrigger: (jobId: number) => void;
    executeTrigger: (application: number, stage: number, stage_name: string) => void;
    refetchTasks: () => Promise<void>;
};

const TriggerContext = createContext<TriggerContextType>({
    tasks: [],
    triggers: [],
    stages: [],
    initializeTrigger: () => {},
    executeTrigger: () => {},
    refetchTasks: async () => {},
});

export const TriggerProvider = ({children}: { children: React.ReactNode }) => {
    const [stages, setStages] = useState<StageResponseType[]>([])
    const [triggers, setTriggers] = useState<StageTrigger[]>([]);
    const [tasks, setTasks] = useState<TriggerTask[]>([]);

    // Function to fetch tasks from the server
    const fetchTasks = useCallback(async () => {
        try {
            const response = await getTasks();
            const parsedResult = JSON.parse(response) as { tasks: TriggerTask[] };
            setTasks(parsedResult.tasks);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    }, []);

    const refetchTasks = useCallback(async () => {
        await fetchTasks();
    }, [fetchTasks]);

    const addTrigger = async (application: number, action: TriggerAction, stage_name: string) => {
        try {
            await addTaskToQueue(application, action, stage_name);
        } catch (error) {
            console.error('Failed to add trigger:', error);
        }
    };

    const initializeTrigger = useCallback(async (jobId: number) => {
        try {
            const result = await getJobListingsStagesAction(jobId);
            const response = Array.isArray(result) ? result : [];

            const parsedTriggers = response.map(cur => ({
                id: cur.id.toString(),
                stage: cur.stage_name,
                actions: JSON.parse(cur.trigger) as TriggerAction[]
            }));

            setStages(response);
            setTriggers(parsedTriggers);
        } catch (error) {
            console.error('Failed to initialize triggers:', error);
        }
    }, []);

    const executeTrigger = (application: number, stage: number, stage_name: string) => {
        const stageTriggers = triggers.filter((t) => Number(t.id) === stage);
        stageTriggers.forEach((trigger) => {
            trigger.actions.forEach(async (action) => {
                if (action.action_type === null) return;
                await addTrigger(application, action, stage_name);
            });
        });

        refetchTasks();
    };

    useEffect(() => {
        fetchTasks();
    }, [])

    return (
        <TriggerContext.Provider value={{tasks, triggers, stages, initializeTrigger, executeTrigger, refetchTasks}}>
            {children}
        </TriggerContext.Provider>
    );
};

export const useTriggers = () => useContext(TriggerContext);
