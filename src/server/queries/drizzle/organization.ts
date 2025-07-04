import {db} from "@/drizzle/db";
import {departments, org_to_department, organization} from "@/drizzle/schema";
import {eq, sql} from "drizzle-orm";
import {CACHE_TAGS, dbCache, getGlobalTag, getIdTag, revalidateDbCache} from "@/lib/cache";
import {departmentSchema, organizationSchema} from "@/zod";
import {z} from "zod";

export const create_organization = async (data: z.infer<typeof organizationSchema>) => {
    return db.insert(organization).values({
        clerk_id: data.clerk_id,
        name: data.name,
    }).$returningId();
};

export const add_department_in_organization = async (data: z.infer<typeof departmentSchema>) => {
    return await db.transaction(async (trx) => {
        const org = await trx.select()
            .from(organization)
            .where(eq(organization.clerk_id, data.orgId));

        const deps = await trx.select().from(departments);

        if (org.length === 0 || deps.length === 0) {
            trx.rollback();
        };

        for (const item of data.departments) {
            const department = deps.find(x => x.name.toLowerCase() === item.toLowerCase());
            if (department) {
                await trx.insert(org_to_department)
                    .values({
                        department_id: department.id,
                        organization_id: org[0].clerk_id,
                    }).onDuplicateKeyUpdate({set: {department_id: sql`department_id`}});
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

        revalidateDbCache({tag: CACHE_TAGS.departments});
    });
};

export const get_organization_by_id = async (org_id: string) => {
    const cacheFn = dbCache(get_organization_by_id_db, {
        tags: [getIdTag(org_id, CACHE_TAGS.organizations)]
    });
    return cacheFn(org_id);
};

export const get_org_departments = async (org_id: string) => {
    const cacheFn = dbCache(get_org_departments_db, {
        tags: [getIdTag(org_id, CACHE_TAGS.departments)]
    });

    return cacheFn(org_id);
};

export const get_all_departments = async () => {
    const cacheFn = dbCache(get_all_departments_db, {
        tags: [getGlobalTag(CACHE_TAGS.departments)]
    });

    return cacheFn()
};

export const get_organization_by_id_db = async (org_id: string) => {
    return db.select().from(organization).where(eq(organization.clerk_id, org_id));
};

export const get_all_departments_db = async () => {
    return await db.select().from(departments);
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