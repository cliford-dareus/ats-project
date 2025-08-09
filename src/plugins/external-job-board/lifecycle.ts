

export const lifecycle = {
    activate: async (context: any) => {
        console.log("Activating External Job Board plugin");
    },

    deactivate: (context: any) => {
        console.log("Deactivating External Job Board plugin");
    },
};
