// import React from 'react';
import ManagePlugins from "@/components/manage-plugins";
import {auth} from "@clerk/nextjs/server";
import {Separator} from "@/components/ui/separator";
import {getPlugins} from "@/lib/plugins-registry";

const Page = async () => {
    const {orgId} = await auth();

    return (
        <div className="p-4">
            <h1>Settings</h1>
            <Separator />
            <ManagePlugins orgId={orgId as string}/>
        </div>
    );
};

export default Page;
