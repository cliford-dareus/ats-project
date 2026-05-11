import { JOB_STAGES } from '@/zod';
import { StageResponseType } from '@/types';
import { z } from 'zod';

export type ConfigType = {
    condition?: {
        type: string;
        target: z.infer<typeof JOB_STAGES>;
        location?: string;
        experience?: number;
        operator?: string;
    };
    email?: {
        to?: string;
        from?: string;
        template?: string;
        subject?: string;
        body?: string;
    };
    delay: number;
    delayFormat: "minutes" | "hours" | "days"
};

export type TriggerAction = {
    id: number;
    action_type: 'MOVE' | 'MESSAGE' | 'INTERVIEW' | 'NOTE' | 'todo' | 'tag' | 'score' | 'EMAIL';
    config: ConfigType;
};

export type StageTrigger = {
    id: string;
    stage: StageResponseType['stage_name'];
    actions: TriggerAction[];
    condition?: any;
};

export type TriggerTask = {
    name: string;
    stages: string;
    type: string;
    application_id: number;
    triggerTime: Date;
    status: string;
};
