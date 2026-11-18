"use server";

import { z } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  canInviteMember,
  hasPermission,
  requirePermission,
} from "../permissions";
import {
  create_organization,
  add_department_in_organization as add_department_query,
  get_organization_by_id,
  update_organization_plugins,
  get_organization_by_subdomain,
  check_organization_subdomain,
  db_get_org_members,
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
import { mask_org_plugin_record } from "@/lib/plugin-encryption";
import type { OrgPluginRecord } from "@/types";

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

  // Invitees land on onboarding after accepting (Clerk rejects an empty
  // redirectUrl, so build a real app URL; override via NEXT_PUBLIC_APP_URL).
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online"}`;
  const response = await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    inviterUserId: userId,
    emailAddress: data.emailAddress,
    role: "org:member",
    redirectUrl: `${appUrl}/onboarding`,
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
  // Departments are org structure — managing them is a settings action,
  // not a job action.
  await requirePermission("settings:manage");

  if (!userId || !orgId || !success) {
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
 *
 * Credentials are MASKED (`••••` + last 4) before returning — this action
 * is client-callable, so full keys must never leave the server here.
 * Server-side consumers that need usable keys use
 * db_get_organization_plugins (decrypted) directly.
 */
export const get_organization_plugins = async (_clientOrgId?: string) => {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  const org = await get_organization_by_id(orgId);
  const plugins = (org[0]?.plugins ?? { enabled: [], settings: {} }) as OrgPluginRecord;
  return mask_org_plugin_record(plugins);
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

  // Subdomain uniqueness: no OTHER org may hold this subdomain.
  // (Defense-in-depth — update_organization_general_settings enforces the
  // same check at the query layer, and the column has a unique constraint.)
  const holders = await check_organization_subdomain(parsed.data.subdomain);
  if (holders.some((h) => h.id !== orgId)) {
    throw new Error("This career-page subdomain is already taken");
  }

  await update_organization_general_settings(orgId, parsed.data);

  revalidatePath("/settings/general-settings");
  revalidatePath("/settings/organization");

  return { success: true };
};

/**
 * Members of the session org, for @mention pickers.
 * Session orgId only — the list is the membership join table, never client input.
 */
export const get_org_members_action = async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  return db_get_org_members(orgId);
};
