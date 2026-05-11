'use client';

import React, {createContext, useContext, useState} from 'react';
import {StageTrigger, TriggerTask} from "@/plugins/smart-trigger/types";
import {get_all_tasks_action} from "@/server/actions/application_actions";

type KanbanContextType = {
    tasks: TriggerTask[];
    setTasks: (tasks: TriggerTask[]) => void;
    triggers: StageTrigger[];
    setTriggers: (triggers: StageTrigger[]) => void;
    jobStages: any[];  // StageResponseType[]
    setJobStages: (stages: any[]) => void;
    fetchApplicationTasks: () => Promise<void>;
    orgMembers: Member[];
    setOrgMembers: (members: Member[]) => void;
};

type Member = {
    id: string;
    name: string;
    email: string;
};

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export function KanbanProvider({children, initialTriggers = [], initialStages = [], initialOrgMembers = []}: {
    children: React.ReactNode;
    initialTriggers?: StageTrigger[];
    initialStages?: any[];
    initialOrgMembers?: Member[];
}) {
    const [tasks, setTasks] = useState<TriggerTask[]>([])
    const [triggers, setTriggers] = useState(initialTriggers);
    const [jobStages, setJobStages] = useState(initialStages);
    const [orgMembers, setOrgMembers] = useState<Member[]>(initialOrgMembers);

    const fetchApplicationTasks = async () => {
        const tasks = await get_all_tasks_action();
        const parsedTasks = JSON.parse(tasks as string) as { tasks: TriggerTask[] };
        setTasks(parsedTasks.tasks);
    };

    const contextValue: KanbanContextType = {
        tasks,
        setTasks,
        jobStages,
        setJobStages,
        triggers,
        setTriggers,
        fetchApplicationTasks,
        orgMembers,
        setOrgMembers,
    };

    return (
        <KanbanContext.Provider value={contextValue}>
            {children}
        </KanbanContext.Provider>
    );
};

export function useKanbanContext() {
    const context = useContext(KanbanContext);
    if (!context) throw new Error('useKanbanContext must be inside KanbanProvider');
    return context;
};