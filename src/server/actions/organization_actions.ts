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
  update_organization_logo,
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
  // The role comes from the caller but is validated against the org role
  // keys — an unknown role never reaches Clerk. Callers that don't pass a
  // role invite as org:member. Note: custom roles (org:recruiter,
  // org:hiring_manager) must exist in the Clerk dashboard, or Clerk
  // rejects the invitation and this throws.
  const ORG_ROLE_KEYS = ["org:admin", "org:recruiter", "org:hiring_manager", "org:member"] as const;
  const role = (data.role && (ORG_ROLE_KEYS as readonly string[]).includes(data.role)
    ? data.role
    : "org:member") as (typeof ORG_ROLE_KEYS)[number];

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online"}`;
  const response = await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    inviterUserId: userId,
    emailAddress: data.emailAddress,
    role,
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
 *
 * Plugin settings (masked keys, config, contact emails) are admin-only:
 * requires plugin:manage. (No read-specific plugin permission exists in
 * the 26-permission map — plugin:manage is the only plugin permission.)
 */
export const get_organization_plugins = async (_clientOrgId?: string) => {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  if (!(await hasPermission("plugin:manage"))) {
    throw new Error("You are not authorized to view plugins");
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
    tagline: org.tagline ?? undefined,
    logo_url: org.logo_url ?? null,
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
    tagline: unsafeData.tagline?.trim() || undefined,
    logo_url: unsafeData.logo_url ?? null,
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

  await update_organization_general_settings(orgId, {
    ...parsed.data,
    tagline: parsed.data.tagline ?? null,
    logo_url: parsed.data.logo_url ?? null,
  });

  revalidatePath("/settings/general-settings");
  revalidatePath("/settings/organization");

  return { success: true };
};

/**
 * Sets (or clears, with null) the org's logo R2 key. The key must come
 * from the logo upload route (our own R2 upload) — a caller passing an
 * arbitrary key only changes what the public logo route serves for this
 * org, and the route refuses keys outside the org branding prefix.
 * Admin-gated: only settings managers may change org branding.
 */
export const set_org_logo_action = async (logoKey: string | null) => {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  const isAdmin = orgRole === "org:admin";
  const canManageSettings = await hasPermission("settings:manage");
  if (!isAdmin && !canManageSettings) {
    throw new Error("You do not have permission to update organization settings");
  }

  if (logoKey !== null) {
    // Keys are ours: orgs/<clerk-id>/branding/logo-<ts>.<ext>, image only.
    if (!/^orgs\/[A-Za-z0-9_-]+\/branding\/logo-\d+\.(png|jpg|jpeg|webp)$/.test(logoKey)) {
      throw new Error("Invalid logo reference");
    }
  }

  await update_organization_logo(orgId, logoKey);

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
