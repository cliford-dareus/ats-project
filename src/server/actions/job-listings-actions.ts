'use server'

import { z } from "zod";
import { create_job_listing, delete_job_listing, get_all_job_listings, get_job_by_id, get_job_listings_stages, update_job_listing } from "@/server/queries";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { jobFormSchema, filterJobSchema, updateJobListingSchema } from "@/zod";
import { canCreateJob } from "@/server/permissions";
import { AutomationRule } from "@/types";
import { db } from "@/drizzle/db";

const jobIdSchema = z.number();

export const create_job_action = async (unsafeData: z.infer<typeof jobFormSchema>) => {
    const { userId } = await auth();
    // const { success, data } = await jobFormSchema.spa(unsafeData);
    // const canCreate = await canCreateJob(userId);

    // if (!success || !userId || !canCreate) {
    //     return { error: true, message: "There was an error creating your product" }
    // }
    console.log('Job created:');

    const { id } = await create_job_listing(unsafeData);
    redirect(`/jobs/${id}`);
};

export const update_job_action = async (unsafeData: z.infer<typeof updateJobListingSchema>) => {
    const { userId } = await auth();
    const { success, data } = await updateJobListingSchema.spa(unsafeData);

    if (!success || !userId) {
        return { error: true, message: "There was an error updating your product" }
    }

    await update_job_listing(data);
    return { success: true };
};

export const delete_job_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const { userId } = await auth();
    const jobId = jobIdSchema.parse(unsafeData);

    if (!userId) {
        return { error: true, message: "There was an error deleting your product" }
    }

    await delete_job_listing(jobId);
    return { success: true };
};

export const get_all_job_listings_action = async (unsafeData: z.infer<typeof filterJobSchema>) => {
    const { userId } = await auth();
    const { success, data } = await filterJobSchema.spa(unsafeData);

    if (!success || !userId) {
        return { error: true, message: "There was an error creating your product" }
    }

    return await get_all_job_listings(data);
};

export const get_job_by_id_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const { userId } = await auth();
    const jobId = jobIdSchema.parse(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!jobId || !userId || !canCreate) {
        return { error: true, message: "There was an error creating your product" }
    }

    return await get_job_by_id(jobId);
};

export const get_job_listings_stages_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const { userId } = await auth();
    const jobId = jobIdSchema.parse(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate || !jobId) {
        return { error: true, message: "There was an error creating your product" }
    }

    return await get_job_listings_stages(jobId);
};

// ─────────────────────────────────────────────────────────────────────────────
//AutomationRules
// ─────────────────────────────────────────────────────────────────────────────
export async function getJobAutomationRules(jobId: number): Promise<AutomationRule[]> {
    const { userId } = await auth();

    if (!userId) {
        return [];
    }

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve([
                {
                    id: "1", name: "Welcome note on apply", enabled: true,
                    job_id: 1,
                    trigger: { event: "stage_changed", toStage: "Applied" },
                    delay: { value: 0, unit: "minutes" },
                    action: { type: "add_note", content: "{{candidate.name}} applied for {{job.title}}. Review resume and schedule screen within 2 days.", pinned: true },
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                },
                {
                    id: "2", name: "SMS after phone screen", enabled: true,
                    job_id: 1,
                    trigger: { event: "stage_changed", toStage: "Phone Interview" },
                    delay: { value: 1, unit: "minutes" },
                    action: { type: "send_sms", to: "candidate", message: "Hi {{candidate.name}}! We'd love to chat. Expect a call from our team shortly. — {{job.title}} Hiring Team" },
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                },
                {
                    id: "3", name: "Email to hiring manager", enabled: true,
                    job_id: 1,
                    trigger: { event: "stage_changed", toStage: "Interview" },
                    delay: { value: 0, unit: "minutes" },
                    action: { type: "send_email", to: "hiring_manager", subject: "{{candidate.name}} has moved to Interview stage", body: "Candidate {{candidate.name}} is now in the Interview stage for {{job.title}}. Review their profile and schedule next steps." },
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                }
            ]);
        }, 300);
    });

}
export async function saveJobAutomationRule(jobId: number, rule: AutomationRule): Promise<void> { }
export async function deleteJobAutomationRule(jobId: number, ruleId: string): Promise<void> { }
