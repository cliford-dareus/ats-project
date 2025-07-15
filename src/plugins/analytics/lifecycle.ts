// Plugin activation/deactivation logic
export const activate = async (context: { setTriggers: (triggers: any[]) => void }) => {
    console.log("Activating Smart Analytics");
    context.setTriggers([]);
};

export const deactivate = (context: { setTriggers: (triggers: any[]) => void }) => {
    console.log("Deactivating Smart Analytics plugin");
    context.setTriggers([]);
};
