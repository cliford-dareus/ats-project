'use client';

import React, {createContext, useContext, useEffect, useState} from 'react';
import {StageTrigger, TriggerAction, TriggerTask} from '@/plugins/smart-trigger/types';
import {addTaskToQueue, getTasks} from '@/server/queries/mongo/smart-task';
import {get_job_listings_stages} from "@/server/queries/drizzle/job-listings";
import {get_job_listings_stages_action} from "@/server/actions/job-listings-actions";

type TriggerContextType = {
    tasks: TriggerTask[];
    triggers: StageTrigger[];
    setTriggers: (triggers: StageTrigger[]) => void;
    executeTrigger: (application: number, stage: number, stage_name: string) => void;
    refetchTasks: () => Promise<void>; // Allow manual refetching of tasks
};

const TriggerContext = createContext<TriggerContextType>({
    tasks: [],
    triggers: [],
    setTriggers: () => {},
    executeTrigger: () => {},
    refetchTasks: async () => {},
});

export const TriggerProvider = ({children, orgId}: { children: React.ReactNode, orgId: string }) => {
    const [triggers, setTriggers] = useState<StageTrigger[]>([]);
    const [tasks, setTasks] = useState<TriggerTask[]>([]);

    // Function to fetch tasks from the server
    const fetchTasks = async () => {
        try {
            const response = await getTasks();
            const parseResult = JSON.parse(response);
            setTasks(parseResult.tasks);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    };

    // Function to manually trigger a task fetch
    const refetchTasks = async () => {
        await fetchTasks();
    };

    // Add a trigger and refetch tasks
    const addTrigger = async (application: number, action: TriggerAction, stage_name: string) => {
        await addTaskToQueue(application, action, stage_name);
    };

    // Execute triggers and refetch tasks
    const executeTrigger = (application: number, stage: number, stage_name: string) => {
        const stageTriggers = triggers.filter((t) => Number(t.id) === stage);

        stageTriggers.forEach((trigger) => {
            trigger.actions.forEach(async (action) => {
                if (action.action_type === null) return;
                await addTrigger(application, action, stage_name);
            });
        });

        refetchTasks(); // Refetch tasks after executing triggers
    };

    // Automatically fetch tasks when `triggers` change
    useEffect(() => {
        fetchTasks();
    }, [triggers]);

    useEffect(() => {
        const fetchTriggers = async () => {
            const result = await get_job_listings_stages_action(orgId);
            // const parsedTriggers = result.reduce((acc: StageTrigger[], cur) => {
            //     const trigger = JSON.parse(cur.trigger);
            //     return [...acc, {id: cur.id.toString(), stage: cur.stage_name, actions: trigger}];
            // }, [] as StageTrigger[]);
            //
            // setTriggers(parsedTriggers);
            console.log(result)
        };

        fetchTriggers()
    }, []);

    return (
        <TriggerContext.Provider value={{tasks, triggers, setTriggers, executeTrigger, refetchTasks}}>
            {children}
        </TriggerContext.Provider>
    );
};

export const useTriggers = () => useContext(TriggerContext);
