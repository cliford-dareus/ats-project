'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { automationEngine, type AutomationExecutionResult } from '@/lib/automation-engine';
import type { PendingExecution } from '@/types';

type KanbanContextType = {
    jobStages: any[];  // StageResponseType[]
    setJobStages: (stages: any[]) => void;
    orgMembers: Member[];
    setOrgMembers: (members: Member[]) => void;
    pendingApplicationIds: Set<number>;
};

type Member = {
    id: string;
    name: string;
    email: string;
};

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export function KanbanProvider({ children, initialStages = [], initialOrgMembers = [] }: {
    children: React.ReactNode;
    initialStages?: any[];
    initialOrgMembers?: Member[];
}) {
    const [jobStages, setJobStages] = useState(initialStages);
    const [orgMembers, setOrgMembers] = useState<Member[]>(initialOrgMembers);

    // Track which applications have pending delayed automation executions.
    // Using a ref so listeners always see the latest set without stale closures.
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

    const addPending = useCallback((applicationId: number) => {
        setPendingIds(prev => {
            const next = new Set(prev);
            next.add(applicationId);
            return next;
        });
    }, []);

    const removePending = useCallback((applicationId: number) => {
        setPendingIds(prev => {
            const next = new Set(prev);
            next.delete(applicationId);
            return next;
        });
    }, []);

    useEffect(() => {
        const onScheduled = (pending: PendingExecution) => {
            addPending(pending.applicationId);
        };

        const onCompleted = (result: AutomationExecutionResult) => {
            removePending(result.applicationId);
        };

        const onFailed = (result: AutomationExecutionResult) => {
            removePending(result.applicationId);
        };

        automationEngine.on('execution:scheduled', onScheduled);
        automationEngine.on('execution:completed', onCompleted);
        automationEngine.on('execution:failed', onFailed);

        return () => {
            automationEngine.off('execution:scheduled', onScheduled);
            automationEngine.off('execution:completed', onCompleted);
            automationEngine.off('execution:failed', onFailed);
        };
    }, [addPending, removePending]);

    const contextValue: KanbanContextType = useMemo(() => ({
        jobStages,
        setJobStages,
        orgMembers,
        setOrgMembers,
        pendingApplicationIds: pendingIds,
    }), [jobStages, orgMembers, pendingIds]);

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
