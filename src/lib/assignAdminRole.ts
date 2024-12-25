"use server"

import {clerkClient} from "@clerk/nextjs/server";

export async function assignAdminRoleToFirstUser(userId: string) {
    const clerk = await clerkClient()
    const users = await clerk.users.getUserList();

    if (users.data.length === 1 && users.data[0].id === userId) {
        console.log(userId);
        await clerkClient().then((c) => {
            c.users.updateUser(userId, {
                publicMetadata: {role: "admin"},
            })
        })
    }
}