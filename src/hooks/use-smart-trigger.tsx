import { useEffect, useState, useCallback } from 'react';
import { usePlugin } from '@/providers/plugin-provider';
import { smartTriggerLifecycle } from '@/plugins/smart-trigger/lifecycle';

export function useSmartTriggers(jobId: number, orgId: string) {
    const isEnabled = usePlugin('smart_triggers');
    const [triggers, setTriggers] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);

    const activate = useCallback(async () => {
        if (!isEnabled) return;

        const context = {
            jobId,
            orgId,
            setTriggers,
            setJobStages: setStages,
        };

        return smartTriggerLifecycle.activate(context);
    }, [isEnabled, jobId, orgId]);

    const triggerAction = useCallback(async (data: { applicationId: number; stageId: number; stageName: string }) => {
        if (!isEnabled) return;
        
        const context = {
            orgId,
            filter: (fn: (t: any) => boolean) => triggers.filter(fn)
        };
        
        await smartTriggerLifecycle.triggerAction(context, {
            ...data,
            jobId
        });
    }, [isEnabled, triggers, jobId, orgId]);

    useEffect(() => {
        activate();
    }, [activate]);

    return {
        isEnabled,
        triggers,
        stages,
        triggerAction,
        refresh: activate
    };
}
