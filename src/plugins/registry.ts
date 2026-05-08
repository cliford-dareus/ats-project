import { smartTriggerPlugin } from './smart-trigger';
import {
    Cloud,
    Database,
    MessageSquare,
    Zap,
    type LucideIcon
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
    'smart_triggers': Zap,
    'calendly': Database,
    'slack': MessageSquare,
    'aws': Cloud,
};

export interface PluginInterface {
    id: string;
    name: string;
    provider: string;
    desc: string;
    icon: string;
    color: string;
    bg: string;
    category?: 'ai' | 'communication' | 'calendar' | 'background' | 'other';
    config?: unknown;
};

export interface PluginSettings {
    active: boolean;
    status: 'Installed' | 'Available' | 'Configure';
}

export const AVAILABLE_PLUGINS: PluginInterface[] = [
    smartTriggerPlugin,
];

