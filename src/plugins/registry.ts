import { smartTriggerPlugin } from './smart-trigger';

export interface PluginInterface {
    id: string;
    name: string;
    provider: string;
    desc: string;
    icon:  any;
    color: string;
    bg: string;
    category?: 'ai' | 'communication' | 'calendar' | 'background' | 'other';
};

export interface PluginSettings {
    active: boolean;
    status: 'Installed' | 'Available' | 'Configure';
}

export const AVAILABLE_PLUGINS: PluginInterface[] = [
    smartTriggerPlugin,
];
