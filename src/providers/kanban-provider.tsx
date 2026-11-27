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
    /** Latest failed automation execution, if any — cleared on dismiss. */
    lastAutomationError: AutomationExecutionResult | null;
    dismissAutomationError: () => void;
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

    // A failed automation used to only clear the pending id — the failure
    // itself was invisible in the UI. Keep the latest failure so the
    // board shows it until dismissed. (There is no toast library in the
    // app, so this uses the same inline dismissible banner pattern as the
    // plugin settings save-error banner.)
    const [lastAutomationError, setLastAutomationError] = useState<AutomationExecutionResult | null>(null);
    const dismissAutomationError = useCallback(() => setLastAutomationError(null), []);

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
            setLastAutomationError(result);
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
        lastAutomationError,
        dismissAutomationError,
    }), [jobStages, orgMembers, pendingIds, lastAutomationError, dismissAutomationError]);

    return (
        <KanbanContext.Provider value={contextValue}>
            {lastAutomationError && (
                <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-start justify-between gap-4" role="alert">
                    <span>
                        ⚠ Automation &ldquo;{lastAutomationError.ruleName}&rdquo; failed
                        {lastAutomationError.error ? `: ${lastAutomationError.error}` : "."}
                    </span>
                    <button onClick={dismissAutomationError} className="text-red-400 underline shrink-0">Dismiss</button>
                </div>
            )}
            {children}
        </KanbanContext.Provider>
    );
};

export function useKanbanContext() {
    const context = useContext(KanbanContext);
    if (!context) throw new Error('useKanbanContext must be inside KanbanProvider');
    return context;
};
