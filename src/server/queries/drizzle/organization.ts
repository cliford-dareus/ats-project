import {db} from "@/drizzle/db";
import {departments, org_to_department, organization} from "@/drizzle/schema";
import {eq} from "drizzle-orm";
import {CACHE_TAGS, dbCache, getGlobalTag} from "@/lib/cache";
import { organizationSchema } from "@/zod";
import { z } from "zod";

export const create_organization = async (data: z.infer<typeof organizationSchema>) => {
    return db.insert(organization).values({
        clerk_id: data.clerk_id,
        name: data.name,
    }).$returningId();
};

export const get_organization_by_id = async (org_id: string) => {
    const cacheFn = dbCache(get_organization_by_id_db, {
        tags: [getGlobalTag(CACHE_TAGS.organizations)]
    });
    return cacheFn(org_id);
};

export const get_org_departments = async (org_id: string) => {
    const cacheFn = dbCache(get_org_departments_db, {
        tags: [getGlobalTag(CACHE_TAGS.departments)]
    });

    return cacheFn(org_id);
};

export const get_organization_by_id_db = async (org_id: string) => {
    return db.select().from(organization).where(eq(organization.clerk_id, org_id));
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