// app/(dashboard)/kanban.tsx/[boardId]/KanbanContext.tsx
'use client';

import {createContext, useCallback, useContext, useState} from 'react';
import {StageTrigger, TriggerTask} from "@/lib/smart-trigger/types";
import {get_all_tasks_action} from "@/server/actions/application_actions";

type KanbanContextType = {
    tasks: TriggerTask[];
    setTasks: (tasks: TriggerTask[]) => void;
    triggers: StageTrigger[];
    setTriggers: (triggers: StageTrigger[]) => void;
    jobStages: any[];  // StageResponseType[]
    setJobStages: (stages: any[]) => void;
    fetchApplicationTasks: () => Promise<void>;
};

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export function KanbanProvider({children, initialTriggers = [], initialStages = []}: {
    children: React.ReactNode;
    initialTriggers?: StageTrigger[];
    initialStages?: any[];
}) {
    const [tasks, setTasks] = useState<TriggerTask[]>([])
    const [triggers, setTriggers] = useState(initialTriggers);
    const [jobStages, setJobStages] = useState(initialStages);

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