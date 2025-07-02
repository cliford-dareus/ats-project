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

export const add_department_in_organization = async (data: any) => {
    return await db.transaction(async (trx) => {
        const org = await trx.select()
            .from(organization)
            .where(eq(organization.clerk_id, data.orgId));

        if (!org) {
            trx.rollback();
        };

        for (const item of data.department) {
            const dep = await trx.insert(departments).values({
                id: item.id,
                name: item.name
            }).$returningId()

            await trx.insert(org_to_department).values({
                department_id: dep[0].id,
                organization_id: org[0].clerk_id,
            });
        };
    });
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