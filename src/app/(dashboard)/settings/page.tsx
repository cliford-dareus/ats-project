// import React from 'react';
import ManagePlugins from "@/components/manage-plugins";
import {auth} from "@clerk/nextjs/server";
import {Separator} from "@/components/ui/separator";
import SmartTriggersFeature from "@/components/smart-trigger-plugin";

const Page = async () => {
    const {orgId} = await auth()

    return (
        <div className="p-4">
            <h1>Settings</h1>
            <Separator />
            <ManagePlugins orgId={orgId as string}/>
            <Separator />
            <SmartTriggersFeature />
        </div>
    );
};

export default Page;