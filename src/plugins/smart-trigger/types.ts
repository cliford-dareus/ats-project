import {StageResponseType} from '@/types';

export type TriggerAction = {
    action_type: 'move' | 'MESSAGE' | 'INTERVIEW' | 'NOTE' | 'todo' | 'tag';
    config: any;
};

export type StageTrigger = {
    id: string;
    stage: StageResponseType['stage_name'];
    actions: TriggerAction[];
};

export type TriggerTask = {
    name: string;
    stages: string;
    type: string;
    application_id: number;
    triggerTime: Date;
    status: string;
};