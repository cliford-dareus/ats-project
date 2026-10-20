// Server-only helper used by the Clerk webhook. Deliberately NOT "use server".
import {clerkClient} from "@clerk/nextjs/server";

/** Marks the very first user of the platform as a platform admin (public metadata). */
export async function assignAdminRoleToFirstUser(userId: string) {
    const clerk = await clerkClient();
    const users = await clerk.users.getUserList({limit: 2});

    if (users.data.length === 1 && users.data[0].id === userId) {
        await clerk.users.updateUser(userId, {
            publicMetadata: {role: "admin"},
        });
    }
}
