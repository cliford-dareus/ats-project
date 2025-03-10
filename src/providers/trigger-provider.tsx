"use client"

import React, {createContext, useContext, useEffect, useState} from 'react';
import {StageTrigger, TriggerAction} from "@/plugins/smart-trigger/types";
import {addTaskToQueue, getTasks} from "@/server/db/smart-task";

type TriggerContextType = {
    tasks: any[];
    triggers: StageTrigger[];
    setTriggers: (triggers: StageTrigger[]) => void;
    // addTrigger: (application: number, action: TriggerAction) => void;
    executeTrigger: (application: number, stage: number, stage_name: string) => void;
};

const TriggerContext = createContext<TriggerContextType>({
    tasks: [],
    triggers: [],
    setTriggers: () => {},
    // addTrigger: () => {},
    executeTrigger: () => {}
});

export const TriggerProvider = ({children}: { children: React.ReactNode }) => {
    const [triggers, setTriggers] = useState<StageTrigger[]>([]);
    const [tasks, setTasks] = useState([]);

    // const addTrigger = (newTrigger: StageTrigger) => {
    //     setTriggers(prev => [...prev, newTrigger]);
    // };

    const addTrigger = async (application: number, action: TriggerAction, stage_name: string) => {
        await addTaskToQueue(application, action, stage_name);
    };

    // const cancelTrigger = async (id: number) => {};

    const executeTrigger = (application: number, stage: number, stage_name: string) => {
        const stageTriggers = triggers.filter(t => Number(t.id) === stage);

        stageTriggers.forEach(trigger => {
            trigger.actions.forEach(async (action) => {
                if (action.action_type === null) return;
                await addTrigger(application, action, stage_name);
            });
        });
    };

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await getTasks();
                const parseResult = JSON.parse(response);
                setTasks(parseResult.tasks);
            } catch (error) {
                console.error("Failed to fetch tasks:", error);
            }
        };
        fetchTasks();
    }, []);

    return (
        <TriggerContext.Provider value={{tasks, triggers, setTriggers, executeTrigger}}>
            {children}
        </TriggerContext.Provider>
    );
};

export const useTriggers = () => useContext(TriggerContext);
