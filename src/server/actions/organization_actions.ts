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
  orgPluginSettingsSchema,
  pluginIdSchema,
} from "@/zod";
import { mask_org_plugin_record, is_masked_plugin_secret } from "@/lib/plugin-encryption";
import type { OrgPluginRecord, OrgPluginSettings } from "@/types";
import { record_activity } from "@/server/activity/record-activity";
import { db_get_organization_plugins_raw } from "../queries/drizzle/plugin-queries";
import { AVAILABLE_PLUGINS } from "@/plugins/registry";

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
 * B7 — semantic activity action for a plugin settings save, derived from
 * the prior stored settings and the validated incoming settings.
 * Priority: new credentials > active flip > plain settings save. Only the
 * label depends on the prior read — the mutation itself is authoritative.
 * A value counts as a "new credential" when it is a non-empty plaintext
 * key; masked echoes (`••••…`) the client sends back on every save do
 * not count. Never inspects a key value beyond the masked/empty checks.
 */
function derive_plugin_update_action(
  prior: OrgPluginSettings | undefined,
  incoming: Partial<OrgPluginSettings>,
): string {
  const hasNewCredential = Object.values(incoming.credentials ?? {}).some(
    (v) => typeof v === "string" && v !== "" && !is_masked_plugin_secret(v),
  );
  if (hasNewCredential) return "plugin.credentials_updated";
  if (
    incoming.active !== undefined &&
    prior?.active !== undefined &&
    incoming.active !== prior.active
  ) {
    return incoming.active ? "plugin.enabled" : "plugin.disabled";
  }
  return "plugin.settings_saved";
}

/** B7 — semantic activity action for a plugin install/uninstall toggle. */
function derive_plugin_toggle_action(enabled: boolean, hadSettingsRow: boolean): string {
  if (!enabled) return "plugin.uninstalled";
  return hadSettingsRow ? "plugin.enabled" : "plugin.installed";
}

const PLUGIN_ACTION_SUMMARIES: Record<string, (name: string) => string> = {
  "plugin.installed": (name) => `Installed the ${name} plugin`,
  "plugin.enabled": (name) => `Enabled the ${name} plugin`,
  "plugin.disabled": (name) => `Disabled the ${name} plugin`,
  "plugin.uninstalled": (name) => `Uninstalled the ${name} plugin`,
  "plugin.settings_saved": (name) => `Updated settings for the ${name} plugin`,
  "plugin.credentials_updated": (name) => `Updated credentials for the ${name} plugin`,
};

/**
 * Plugin settings updates are scoped to session orgId only.
 * `_clientOrgId` is ignored if present.
 *
 * B5: pluginId and settings are validated at this boundary — unknown
 * plugin ids, non-allowlisted credential keys, mistyped config fields,
 * and unknown integration ids are rejected with a clear message instead
 * of being persisted verbatim.
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

  const parsedId = pluginIdSchema.safeParse(pluginId);
  if (!parsedId.success) {
    throw new Error(parsedId.error.issues[0]?.message ?? "Invalid plugin id");
  }

  const parsedSettings = orgPluginSettingsSchema(pluginId).safeParse(settings);
  if (!parsedSettings.success) {
    throw new Error(parsedSettings.error.issues[0]?.message ?? "Invalid plugin settings");
  }

  // Prior settings, for the audit label only (fresh raw read, no cache).
  const priorRecord = await db_get_organization_plugins_raw(orgId);
  const priorSettings = priorRecord.settings?.[pluginId];

  const result = await update_organization_plugins(orgId, pluginId, parsedSettings.data);

  // B7: audit AFTER a successful mutation. Plugins have no numeric id,
  // so entity_id is always 0 — the feed renders these entries with no
  // View button. Never includes credential values.
  if (!(result && typeof result === "object" && "error" in result && result.error)) {
    const action = derive_plugin_update_action(priorSettings, parsedSettings.data);
    const name = AVAILABLE_PLUGINS.find((p) => p.id === pluginId)?.name ?? pluginId;
    await record_activity({
      action,
      entity_type: "plugin",
      entity_id: 0,
      summary: PLUGIN_ACTION_SUMMARIES[action]?.(name) ?? `Updated the ${name} plugin`,
    });
  }

  return result;
};

/**
 * Plugin enable/disable is scoped to session orgId only.
 * `_clientOrgId` is ignored if present.
 *
 * B5: pluginId and the optional config are validated like the settings
 * save above. Credentials are stripped here — toggle/install never
 * introduces keys (they are only set via the encrypting save path), so a
 * client must not smuggle one in through config.
 */
export const toggle_organization_plugin_action = async (
  _clientOrgId: string,
  enabled: boolean,
  pluginId: string,
  config?: Partial<OrgPluginSettings>
) => {
  const { userId, orgId } = await auth();
  const canManage = await hasPermission("plugin:manage");

  if (!userId || !orgId || !canManage) {
    throw new Error("You are not authorized to update plugins");
  }

  const parsedId = pluginIdSchema.safeParse(pluginId);
  if (!parsedId.success) {
    throw new Error(parsedId.error.issues[0]?.message ?? "Invalid plugin id");
  }

  let toggleConfig: Partial<Omit<OrgPluginSettings, "credentials">> | undefined;
  if (config !== undefined) {
    const parsedConfig = orgPluginSettingsSchema(pluginId).safeParse(config);
    if (!parsedConfig.success) {
      throw new Error(parsedConfig.error.issues[0]?.message ?? "Invalid plugin config");
    }
    const { credentials: _ignored, ...rest } = parsedConfig.data;
    toggleConfig = rest;
  }

  // Prior settings row, for the audit label only (fresh raw read).
  const priorRecord = await db_get_organization_plugins_raw(orgId);
  const hadSettingsRow = priorRecord.settings?.[pluginId] !== undefined;

  const result = await toggle_organization_plugin(
    orgId,
    Boolean(enabled),
    pluginId,
    toggleConfig
  );

  // B7: audit AFTER a successful mutation (entity_id 0 — see above).
  if (!(result && typeof result === "object" && "error" in result && result.error)) {
    const action = derive_plugin_toggle_action(Boolean(enabled), hadSettingsRow);
    const name = AVAILABLE_PLUGINS.find((p) => p.id === pluginId)?.name ?? pluginId;
    await record_activity({
      action,
      entity_type: "plugin",
      entity_id: 0,
      summary: PLUGIN_ACTION_SUMMARIES[action]?.(name) ?? `Updated the ${name} plugin`,
    });
  }

  return result;
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
