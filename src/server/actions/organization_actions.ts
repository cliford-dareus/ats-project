"use server"

import {z} from "zod";
import {auth, clerkClient} from "@clerk/nextjs/server";
import {canCreateJob} from "../permissions";
import {create_organization, add_department_in_organization as add_department_query} from "../queries";
import {departmentSchema, inviteMemberSchema, organizationSchema} from "@/zod";

export const create_organization_invite = async (unsafeData: z.infer<typeof inviteMemberSchema>) => {
    const client = await clerkClient();
    const {userId} = await auth();
    const {success, data} = await inviteMemberSchema.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!canCreate || !success || !userId) {
        throw new Error("You are not authorized to create an organization");
    };

    const response = await client.organizations.createOrganizationInvitation({
        organizationId: data.organizationId,
        inviterUserId: data.inviterUserId,
        emailAddress: data.emailAddress,
        role: 'member',
        redirectUrl: ""
    });

    return response.id;
};

export const create_organization_action = async (unsafeData: z.infer<typeof organizationSchema>) => {
    const {userId} = await auth();
    const {success, data} = await organizationSchema.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!canCreate || !success || !userId) {
        throw new Error("You are not authorized to create an organization");
    };

    return await create_organization(data);
};

export const add_department_in_organization = async (unsafeData: z.infer<typeof  departmentSchema>) => {
    const {userId} = await auth();
    const {success, data} = await departmentSchema.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!userId || !success || !canCreate) {
        throw new Error("You are not authorized to create an organization");
    };

    return await add_department_query(data);
};
