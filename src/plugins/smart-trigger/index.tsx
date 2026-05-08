const smartTriggerConfig = {
    
};

export const smartTriggerPlugin = {
    id: 'smart_triggers',
    name: 'Smart Triggers',
    provider: 'TalentPortal',
    desc: 'Automate actions when candidates move stages.',
    icon: "zap",
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    category: 'other',
    config: smartTriggerConfig,
} as const;
