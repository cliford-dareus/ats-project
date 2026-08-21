"use server"

import { z } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { canCreateJob } from "../permissions";
import {
    create_organization,
    add_department_in_organization as add_department_query,
    get_organization_by_id,
    update_organization_plugins,
    get_organization_by_subdomain,
    toggle_organization_plugin,
    update_organization_general_settings,
} from "../queries";
import { departmentSchema, inviteMemberSchema, organizationSchema } from "@/zod";

export const generalSettingsSchema = z.object({
    name: z.string().min(2, "Company name is required").max(100),
    locations: z.string().min(2, "Headquarters / location is required").max(255),
    phone: z.string().min(7, "Phone number is required").max(40),
    email: z.string().email("Enter a valid company email"),
    primary_color: z.string().min(2).max(40),
    font_family: z.enum(["sans", "serif", "mono"]),
    subdomain: z
        .string()
        .min(3, "Subdomain must be at least 3 characters")
        .max(63)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

export const create_organization_invite = async (unsafeData: z.infer<typeof inviteMemberSchema>) => {
    const client = await clerkClient();
    const { userId } = await auth();
    const { success, data } = await inviteMemberSchema.spa(unsafeData);
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
    const { userId } = await auth();
    const { success, data } = await organizationSchema.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!canCreate || !success || !userId) {
        throw new Error("You are not authorized to create an organization");
    };

    return await create_organization(data);
};

export const add_department_in_organization = async (unsafeData: z.infer<typeof departmentSchema>) => {
    const { userId } = await auth();
    const { success, data } = await departmentSchema.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!userId || !success || !canCreate) {
        throw new Error("You are not authorized to create an organization");
    };

    return await add_department_query(data);
};

export const get_organization_by_subdomain_action = async (subdomain: string) => {
    return await get_organization_by_subdomain(subdomain);
};

export const get_organization_plugins = async (orgId: string) => {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("You are not authorized to create an organization");
    };

    const org = await get_organization_by_id(orgId);
    return org[0]?.plugins || { enabled: [], settings: {} };
};

export const update_organization_plugins_action = async (orgId: string, settings: object, pluginId: string) => {
    const { userId } = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        throw new Error("You are not authorized to create an organization");
    };

    return await update_organization_plugins(orgId, pluginId, settings);
};

export const toggle_organization_plugin_action = async (orgId: string, enabled: boolean, pluginId: string, config?: any) => {
    const { userId } = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        throw new Error("You are not authorized to create an organization");
    };

    return await toggle_organization_plugin(orgId, enabled, pluginId, config);
};

export const get_general_settings_action = async () => {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        throw new Error("Unauthorized");
    }

    const rows = await get_organization_by_id(orgId);
    const org = rows[0];
    if (!org) {
        throw new Error("Organization not found");
    }

    return {
        name: org.name,
        locations: org.locations,
        phone: org.phone,
        email: org.email,
        primary_color: org.primary_color,
        font_family: (org.font_family as "sans" | "serif" | "mono") || "sans",
        subdomain: org.subdomain,
    } satisfies GeneralSettingsInput;
};

export const update_general_settings_action = async (unsafeData: GeneralSettingsInput) => {
    const { userId, orgId, orgRole } = await auth();
    if (!userId || !orgId) {
        throw new Error("Unauthorized");
    }

    // Prefer admin for org-wide settings; fall back to existing canCreateJob gate
    const isAdmin = orgRole === "org:admin";
    const canCreate = await canCreateJob(userId);
    if (!isAdmin && !canCreate) {
        throw new Error("You do not have permission to update organization settings");
    }

    const parsed = generalSettingsSchema.safeParse({
        ...unsafeData,
        subdomain: unsafeData.subdomain.trim().toLowerCase(),
        email: unsafeData.email.trim().toLowerCase(),
        name: unsafeData.name.trim(),
        locations: unsafeData.locations.trim(),
        phone: unsafeData.phone.trim(),
    });

    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid settings");
    }

    await update_organization_general_settings(orgId, parsed.data);

    revalidatePath("/settings/general-settings");
    revalidatePath("/settings/organization");

    return { success: true };
};
