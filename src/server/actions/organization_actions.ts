"use server";

import { z } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  canCreateJob,
  canInviteMember,
  hasPermission,
} from "../permissions";
import {
  create_organization,
  add_department_in_organization as add_department_query,
  get_organization_by_id,
  update_organization_plugins,
  get_organization_by_subdomain,
  toggle_organization_plugin,
  update_organization_general_settings,
} from "../queries";
import {
  departmentSchema,
  GeneralSettingsInput,
  generalSettingsSchema,
  inviteMemberSchema,
  organizationSchema,
} from "@/zod";

export const create_organization_invite = async (
  unsafeData: z.infer<typeof inviteMemberSchema>
) => {
  const client = await clerkClient();
  const { userId, orgId } = await auth();
  const { success, data } = await inviteMemberSchema.spa(unsafeData);
  const canInvite = await canInviteMember();

  if (!canInvite || !success || !userId || !orgId) {
    throw new Error("You are not authorized to invite members");
  }

  // Never trust client organizationId — invitations only for active session org
  if (data.organizationId !== orgId) {
    throw new Error("Cannot invite members to another organization");
  }

  const response = await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    inviterUserId: userId,
    emailAddress: data.emailAddress,
    role: "org:member",
    redirectUrl: "",
  });

  return response.id;
};

export const create_organization_action = async (
  unsafeData: z.infer<typeof organizationSchema>
) => {
  const { userId } = await auth();
  const { success, data } = await organizationSchema.spa(unsafeData);

  if (!success || !userId) {
    throw new Error("You are not authorized to create an organization");
  }

  return await create_organization(data);
};

export const add_department_in_organization = async (
  unsafeData: z.infer<typeof departmentSchema>
) => {
  const { userId, orgId } = await auth();
  const { success, data } = await departmentSchema.spa(unsafeData);
  const canCreate = await canCreateJob();

  if (!userId || !orgId || !success || !canCreate) {
    throw new Error("You are not authorized to update departments");
  }

  // Force session org — ignore client orgId
  return await add_department_query({ ...data, orgId });
};

export const get_organization_by_subdomain_action = async (
  subdomain: string
) => {
  return await get_organization_by_subdomain(subdomain);
};

/**
 * Plugin reads always use the active Clerk organization from the session.
 * The optional `_clientOrgId` argument is ignored (kept for call-site compatibility).
 */
export const get_organization_plugins = async (_clientOrgId?: string) => {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  const org = await get_organization_by_id(orgId);
  return org[0]?.plugins || { enabled: [], settings: {} };
};

/**
 * Plugin settings updates are scoped to session orgId only.
 * `_clientOrgId` is ignored if present.
 */
export const update_organization_plugins_action = async (
  _clientOrgId: string,
  settings: object,
  pluginId: string
) => {
  const { userId, orgId } = await auth();
  const canManage = await hasPermission("plugin:manage");

  if (!userId || !orgId || !canManage) {
    throw new Error("You are not authorized to update plugins");
  }

  if (!pluginId || typeof pluginId !== "string") {
    throw new Error("Invalid plugin id");
  }

  return await update_organization_plugins(orgId, pluginId, settings);
};

/**
 * Plugin enable/disable is scoped to session orgId only.
 * `_clientOrgId` is ignored if present.
 */
export const toggle_organization_plugin_action = async (
  _clientOrgId: string,
  enabled: boolean,
  pluginId: string,
  config?: unknown
) => {
  const { userId, orgId } = await auth();
  const canManage = await hasPermission("plugin:manage");

  if (!userId || !orgId || !canManage) {
    throw new Error("You are not authorized to update plugins");
  }

  if (!pluginId || typeof pluginId !== "string") {
    throw new Error("Invalid plugin id");
  }

  return await toggle_organization_plugin(
    orgId,
    Boolean(enabled),
    pluginId,
    config
  );
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

export const update_general_settings_action = async (
  unsafeData: GeneralSettingsInput
) => {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  const isAdmin = orgRole === "org:admin";
  const canManageSettings = await hasPermission("settings:manage");
  if (!isAdmin && !canManageSettings) {
    throw new Error(
      "You do not have permission to update organization settings"
    );
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
