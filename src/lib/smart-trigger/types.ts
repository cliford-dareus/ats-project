import {StageResponseType} from '@/types';

export type ConfigType = {
    condition: {
        type: string;
        target: string;
        location?: string;
        template?: string;
        experience?: number;
        operator?: string;
    };
    delay: number;
    delayFormat: "minutes" | "hours" | "days"
};

export type TriggerAction = {
    id: number;
    action_type: 'move' | 'MESSAGE' | 'INTERVIEW' | 'NOTE' | 'todo' | 'tag' | 'score' | 'email';
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
