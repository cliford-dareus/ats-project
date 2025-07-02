// Plugin activation/deactivation logic
export const activate = (context: { setTriggers: (triggers: any[]) => void }) => {
    console.log("Activating Smart Triggers plugin");
    context.setTriggers([]);
};

export const deactivate = (context: { setTriggers: (triggers: any[]) => void }) => {
    console.log("Deactivating Smart Triggers plugin");
    context.setTriggers([]);
};