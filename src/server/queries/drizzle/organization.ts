import { z } from "zod";
import { db } from "@/drizzle/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { GeneralSettingsUpdate } from "@/types";
import { departmentSchema, organizationSchema } from "@/zod";
import { departments, org_to_department, organization, organization_member, users_table } from "@/drizzle/schema";
import { CACHE_TAGS, dbCache, getGlobalTag, getIdTag, revalidateDbCache } from "@/lib/cache";
import {
    encrypt_org_plugin_record_credentials,
    is_plugin_encryption_error,
    mask_plugin_settings,
    resolve_saved_plugin_credentials,
} from "@/lib/plugin-encryption";
import type { OrgPluginRecord, OrgPluginSettings } from "@/types";

export const create_organization = async (data: z.infer<typeof organizationSchema>) => {
    const result = await db.insert(organization).values({
        clerk_id: data.clerk_id,
        name: data.name,
        subdomain: data.subdomain
    }).$returningId();

    revalidateDbCache({ tag: CACHE_TAGS.organizations, orgId: data.clerk_id });
    return result;
};

export const update_organization_plugins = async (orgId: string, pluginId: string, settings?: object) => {
    try {
        const result = await db
            .select({ plugins: organization.plugins })
            .from(organization)
            .where(eq(organization.clerk_id, orgId));

        if (!result.length) {
            return { error: "Organization not found" };
        };

        const pluginsData = result[0].plugins as OrgPluginRecord;
        const existing_settings = (pluginsData.settings?.[pluginId] ?? {}) as OrgPluginSettings;
        const incoming_settings = (settings ?? {}) as Partial<OrgPluginSettings>;

        // Credentials are resolved, never stored raw:
        //  • absent in `incoming` → stored (encrypted) values preserved
        //    (config-only saves, active toggles);
        //  • masked echoes (`••••…`) → stored value preserved (the client
        //    only ever sees masked values, so it echoes them back);
        //  • new plaintext → AES-256-GCM encrypted — this THROWS when
        //    PLUGIN_ENCRYPTION_KEY is missing/malformed, so a new key is
        //    never stored plaintext (re-thrown below, not swallowed);
        //  • empty object + active === false (disconnect) → cleared.
        // Merging with the stored settings (instead of replacing them)
        // also means a save can no longer wipe config/credentials the
        // client didn't send.
        const next_settings: OrgPluginSettings = {
            ...existing_settings,
            ...incoming_settings,
            credentials: resolve_saved_plugin_credentials(
                existing_settings.credentials,
                incoming_settings.credentials,
                { clear_on_empty: incoming_settings.active === false },
            ),
        };
        if (next_settings.credentials === undefined) {
            delete next_settings.credentials;
        }

        const updatedPlugins: OrgPluginRecord = {
            ...pluginsData,
            settings: {
                ...pluginsData.settings,
                [pluginId]: next_settings,
            },
        };

        // Lazy migration: one re-save re-encrypts any remaining legacy
        // plaintext credentials across the whole org blob. Best-effort —
        // a missing key must not block this save (the plugin being saved
        // already threw above if IT needed the key).
        let plugins_to_store = updatedPlugins;
        try {
            plugins_to_store = encrypt_org_plugin_record_credentials(updatedPlugins);
        } catch (error) {
            console.warn(
                "[plugin-encryption] Lazy migration skipped for org plugin blob:",
                error,
            );
        }

        await db
            .update(organization)
            .set({ plugins: plugins_to_store })
            .where(eq(organization.clerk_id, orgId));

        revalidateDbCache({ tag: CACHE_TAGS.organizations, id: orgId });

        // Return the saved settings MASKED so the client can adopt them
        // without a just-typed key lingering in browser state.
        return { message: "Success", settings: mask_plugin_settings(next_settings) };
    } catch (error) {
        // Encryption failures fail LOUDLY: re-throw so the server action
        // surfaces the real reason instead of a generic error.
        if (is_plugin_encryption_error(error)) throw error;
        console.error('Error toggling plugin:', error);
        return { error: "Internal server error" };
    }
};

export const toggle_organization_plugin = async (orgId: string, enabled: boolean, pluginId: string, config?: any) => {
    try {
        const org = await db.select()
            .from(organization)
            .where(eq(organization.clerk_id, orgId));

        if (org.length === 0) {
            return { error: "Organization not found" };
        }

        const pluginsData = org[0].plugins as OrgPluginRecord;
        const updatedEnabled = enabled
            ? [...new Set([...pluginsData.enabled, pluginId])] // install extension
            : pluginsData.enabled.filter((id: string) => id !== pluginId); // uninstall extension

        const updatedSettings = enabled
            ? { ...pluginsData.settings, [pluginId]: { ...pluginsData.settings[pluginId], ...config, active: true } }
            : { ...pluginsData.settings, [pluginId]: { ...pluginsData.settings[pluginId], active: false } };

        const updatedPlugins: OrgPluginRecord = {
            ...pluginsData,
            enabled: updatedEnabled,
            settings: updatedSettings,
        };

        // Toggle never introduces new credentials (install passes no
        // config today; keys are only set via the encrypting save path),
        // so this is just the lazy migration pass — best-effort, never
        // blocks an install/uninstall when the key is unconfigured.
        let plugins_to_store = updatedPlugins;
        try {
            plugins_to_store = encrypt_org_plugin_record_credentials(updatedPlugins);
        } catch (error) {
            console.warn(
                "[plugin-encryption] Lazy migration skipped for org plugin blob:",
                error,
            );
        }

        await db
            .update(organization)
            .set({ plugins: plugins_to_store })
            .where(eq(organization.clerk_id, orgId));

        revalidateDbCache({ tag: CACHE_TAGS.organizations, id: orgId });
        return { message: "Success" };
    } catch (error) {
        console.error('Error toggling plugin:', error);
        return { error: "Internal server error" };
    }
};

export const add_department_in_organization = async (data: z.infer<typeof departmentSchema>) => {
    return await db.transaction(async (trx) => {
        const org = await trx.select()
            .from(organization)
            .where(eq(organization.clerk_id, data.orgId));

        const deps = await trx.select().from(departments);

        for (const item of data.departments) {
            const department = deps.find(x => x.name.toLowerCase() === item.toLowerCase());
            if (department) {
                await trx.insert(org_to_department)
                    .values({
                        department_id: department.id,
                        organization_id: org[0].clerk_id,
                    }).onDuplicateKeyUpdate({ set: { department_id: sql`department_id` } });
            } else {
                const [department] = await trx.insert(departments).values({
                    name: item,
                }).$returningId();

                await trx.insert(org_to_department).values({
                    department_id: department.id,
                    organization_id: org[0].clerk_id,
                });
            };
        };

        revalidateDbCache({ tag: CACHE_TAGS.departments, orgId: org[0].clerk_id });
    });
};

export const get_organization_by_subdomain = async (subdomain: string) => {
    const cacheFn = dbCache(get_organization_by_subdomain_db, {
        tags: [getGlobalTag(CACHE_TAGS.organizations)]
    });
    return cacheFn(subdomain);
};

export const get_organization_by_subdomain_db = async (subdomain: string) => {
    return await db.select({
        name: organization.name,
        locations: organization.locations,
        phone: organization.phone,
        email: organization.email,
        primary_color: organization.primary_color,
        font_family: organization.font_family,
        subdomain: organization.subdomain,
    })
        .from(organization)
        .where(eq(organization.subdomain, subdomain))
};

export const get_organization_by_id = async (org_id: string) => {
    const cacheFn = dbCache(get_organization_by_id_db, {
        tags: [getIdTag(org_id, CACHE_TAGS.organizations)]
    });
    return cacheFn(org_id);
};

export const get_organization_by_id_db = async (org_id: string) => {
    return db.select().from(organization).where(eq(organization.clerk_id, org_id));
};

export const update_organization_general_settings = async (orgId: string, data: GeneralSettingsUpdate) => {
    // If subdomain changed, ensure uniqueness
    const current = await db
        .select({
            subdomain: organization.subdomain,
        })
        .from(organization)
        .where(eq(organization.clerk_id, orgId))
        .limit(1);

    if (!current.length) {
        throw new Error("Organization not found");
    }

    if (data.subdomain !== current[0].subdomain) {
        const taken = await db
            .select({ id: organization.clerk_id })
            .from(organization)
            .where(eq(organization.subdomain, data.subdomain))
            .limit(1);

        if (taken.length > 0) {
            throw new Error("This career-page subdomain is already taken");
        }
    }

    await db
        .update(organization)
        .set({
            name: data.name,
            locations: data.locations,
            phone: data.phone,
            email: data.email,
            primary_color: data.primary_color,
            font_family: data.font_family,
            subdomain: data.subdomain,
        })
        .where(eq(organization.clerk_id, orgId));

    revalidateDbCache({ tag: CACHE_TAGS.organizations, id: orgId });

    return { success: true };
};

export const get_all_departments = async () => {
    const cacheFn = dbCache(get_all_departments_db, {
        tags: [getGlobalTag(CACHE_TAGS.departments)]
    });

    return cacheFn()
};

export const get_all_departments_db = async () => {
    return await db.select().from(departments);
};

export const get_org_departments = async (org_id: string) => {
    const cacheFn = dbCache(get_org_departments_db, {
        tags: [getIdTag(org_id, CACHE_TAGS.departments)]
    });

    return cacheFn(org_id);
};

export const get_org_departments_db = async (org_id: string) => {
    return db.select({
        id: org_to_department.id,
        organization_id: org_to_department.organization_id,
        name: departments.name,
    }).from(org_to_department)
        .where(eq(org_to_department.organization_id, org_id))
        .leftJoin(departments, eq(departments.id, org_to_department.department_id));
};

export const get_oganization_users = async (org_id: string) => { 
    const cacheFn = dbCache(get_oganization_users_db, {
        tags: [getIdTag(org_id, CACHE_TAGS.organizations)]
    });

    return cacheFn(org_id);
};

export const get_oganization_users_db = async (org_id: string) => {
   // return the user with their details
   return await db.select({
        id: users_table.id,
        name: users_table.name,
        email: users_table.email,
        username: users_table.username,
        image_url: users_table.image_url,
        organization_id: organization_member.organization_id,
    })
        .from(organization_member)
        .innerJoin(users_table, eq(organization_member.user_id, users_table.id))
        .where(eq(organization_member.organization_id, org_id))
        .orderBy(users_table.name);
};

// Helper functions
export const check_organization_subdomain = async (subdomain: string) => {
    const existingSubdomain = await db
        .select({ id: organization.clerk_id })
        .from(organization)
        .where(eq(organization.subdomain, subdomain));

    return existingSubdomain;
};

export const ensure_organization_row = async (orgId: string, subdomain?: string) => {
    const existing = await db.select().from(organization).where(and(eq(organization.clerk_id, orgId), ...(subdomain ? [eq(organization.subdomain, subdomain)] : []))).limit(1);
    // if (!existing.length) {
    //     throw new Error("Organization not found");
    // }
    return existing[0];
};

// ── Org members (for @mentions) ───────────────────────────────────────────────
// Membership is the source of truth for who can be mentioned / notified:
// only users with a row in organization_member for this org are returned.
export const db_get_org_members = async (orgId: string) => {
    return db
        .select({
            id: users_table.id,
            name: users_table.name,
            email: users_table.email,
            username: users_table.username,
            image_url: users_table.image_url,
        })
        .from(organization_member)
        .innerJoin(users_table, eq(organization_member.user_id, users_table.id))
        .where(eq(organization_member.organization_id, orgId))
        .orderBy(users_table.name);
};

// Same as above, restricted to the given user ids — used to verify a
// client-supplied mention list against real org membership.
export const db_get_org_members_by_ids = async (orgId: string, userIds: string[]) => {
    if (userIds.length === 0) return [];

    return db
        .select({
            id: users_table.id,
            name: users_table.name,
            email: users_table.email,
            username: users_table.username,
            image_url: users_table.image_url,
        })
        .from(organization_member)
        .innerJoin(users_table, eq(organization_member.user_id, users_table.id))
        .where(
            and(
                eq(organization_member.organization_id, orgId),
                inArray(organization_member.user_id, userIds),
            ),
        );
};
