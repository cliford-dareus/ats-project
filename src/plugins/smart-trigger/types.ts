import { StageResponseType } from '@/types';

export type TriggerAction = {
  action_type: 'move' | 'MESSAGE' | 'INTERVIEW' | 'NOTE' | 'todo' | 'tag';
  config: any;
};

export type StageTrigger = {
  id: string;
  stage: StageResponseType['stage_name'];
  actions: TriggerAction[];
};