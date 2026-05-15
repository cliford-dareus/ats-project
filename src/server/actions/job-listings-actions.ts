'use server'

import {z} from "zod";
import {
    create_job_listing,
    delete_job_listing,
    get_all_job_listings,
    get_job_by_id,
    get_job_listings_stages,
    update_job_listing
} from "@/server/queries";
import {auth} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {jobFormSchema, filterJobSchema, updateJobListingSchema} from "@/zod";
import {assertJobBelongsToOrg, canCreateJob, getAuthOrThrow} from "@/server/permissions";
import {AutomationRule} from "@/types";
import {db} from "@/drizzle/db";
import {automation_rules} from "@/drizzle/schema";
import {and, eq} from "drizzle-orm";

const jobIdSchema = z.number();

// TODO: Fix validation later
export const create_job_action = async (unsafeData: z.infer<typeof jobFormSchema>) => {
    // const { success, data } = await jobFormSchema.spa(unsafeData);
    // if (!success) {
    //     return { error: true, message: "There was an error creating your product" }
    // }

    // const {userId} = await auth();
    // await canCreateJob(userId);
    console.log('Job created:');

    const {id} = await create_job_listing(unsafeData);
    redirect(`/jobs/${id}`);
};

export const update_job_action = async (unsafeData: z.infer<typeof updateJobListingSchema>) => {
    const {success, data} = await updateJobListingSchema.spa(unsafeData);
    if (!success) {
        return {error: true, message: "There was an error updating your product"}
    }

    const {orgId} = await getAuthOrThrow();
    await assertJobBelongsToOrg(data.jobId, orgId);

    await update_job_listing(data);
    return {success: true};
};

export const delete_job_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const {success, data} = await jobIdSchema.spa(unsafeData);
    if (!success) {
        return {error: true, message: "There was an error updating your product"}
    }

    const {orgId} = await getAuthOrThrow();
    await assertJobBelongsToOrg(data, orgId);

    await delete_job_listing(data);
    return {success: true};
};

export const get_all_job_listings_action = async (unsafeData: z.infer<typeof filterJobSchema>) => {
    const {userId} = await getAuthOrThrow();
    const {success, data} = await filterJobSchema.spa(unsafeData);

    if (!success || !userId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_all_job_listings(data);
};

export const get_job_by_id_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const {userId, orgId} = await getAuthOrThrow();
    const jobId = jobIdSchema.parse(unsafeData);

    if (!jobId || !userId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_job_by_id(jobId, orgId);
};

export const get_job_listings_stages_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const {userId} = await auth();
    const jobId = jobIdSchema.parse(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate || !jobId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_job_listings_stages(jobId);
};

// ─────────────────────────────────────────────────────────────────────────────
//AutomationRules
// ─────────────────────────────────────────────────────────────────────────────

// ── GET ───────────────────────────────────────────────────────────────────────
export const getJobAutomationRules = async (jobId: number): Promise<AutomationRule[]> => {
    const {orgId} = await getAuthOrThrow();
    await assertJobBelongsToOrg(jobId, orgId);

    const rows = await db
        .select()
        .from(automation_rules)
        .where(
            and(
                eq(automation_rules.job_id, jobId),
                eq(automation_rules.org_id, orgId),
            ),
        )
        .orderBy(automation_rules.created_at);

    return rows.map((r) => ({
        id: r.id.toString(),
        job_id: r.job_id,
        org_id: r.org_id,
        name: r.name,
        enabled: r.enabled as boolean,
        trigger: r.trigger as AutomationRule["trigger"],
        delay: r.delay as AutomationRule["delay"],
        action: r.action as AutomationRule["action"],
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
    }));
}

// ── SAVE (upsert) ─────────────────────────────────────────────────────────────
export const saveJobAutomationRule = async (jobId: number, rule: AutomationRule,): Promise<AutomationRule> => {
    const {orgId} = await getAuthOrThrow();
    await assertJobBelongsToOrg(jobId, orgId);

    const isNew = rule.id.startsWith("rule_"); // client-generated temp ids
    if (isNew) {
        const [inserted] = await db
            .insert(automation_rules)
            .values({
                job_id: jobId,
                org_id: orgId,
                name: rule.name,
                enabled: rule.enabled,
                trigger: rule.trigger,
                delay: rule.delay,
                action: rule.action,
                created_at: new Date(),
                updated_at: new Date(),
            }).$returningId()

        const [new_rule] = await db.select()
            .from(automation_rules)
            .where(eq(automation_rules.id, inserted.id))
            .limit(1);

        return {
            ...rule,
            id: new_rule.id.toString(),
            created_at: new_rule.created_at.toISOString(),
            updated_at: new_rule.updated_at.toISOString(),
        };
    }

    // Existing rule — update
    await db
        .update(automation_rules)
        .set({
            name: rule.name,
            enabled: rule.enabled,
            trigger: rule.trigger,
            delay: rule.delay,
            action: rule.action,
            updated_at: new Date(),
        })
        .where(
            and(
                eq(automation_rules.id, rule.id),
                eq(automation_rules.job_id, jobId),
                eq(automation_rules.org_id, orgId),  // ← prevents cross-org writes
            ),
        );

    const [updated_rule] = await db.select()
        .from(automation_rules)
        .where(eq(automation_rules.id, rule.id))
        .limit(1);

    if (!updated_rule) throw new Error(`Rule ${rule.id} not found`);

    return {
        ...rule,
        updated_at: updated_rule.updated_at.toISOString(),
    };
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export const deleteJobAutomationRule = async (jobId: number, ruleId: string,): Promise<void> => {
    const {orgId} = await getAuthOrThrow();
    await assertJobBelongsToOrg(jobId, orgId);

    await db
        .delete(automation_rules)
        .where(
            and(
                eq(automation_rules.id, ruleId),
                eq(automation_rules.job_id, jobId),
                eq(automation_rules.org_id, orgId),  // ← prevents cross-org deletes
            ),
        );
}