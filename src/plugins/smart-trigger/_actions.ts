import { applications, stages } from "@/drizzle/schema";
import { ConfigType } from "./types";
import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle/db";

interface SmartTriggerJobData {
    application_id: number;
    newStageId: number;
    jobId: number;
    type: string;
    config: ConfigType;
};

export const executeSmartTriggerAction = async (jobData: SmartTriggerJobData) => {
    const { type } = jobData;
    switch (type) {
        case 'MOVE':
            await executeSmartMoveAction(jobData);
            break;
        default:
    }
};

export const executeSmartMoveAction = async (jobData: SmartTriggerJobData) => {
    const { application_id, newStageId, config } = jobData;

    // Fetch application and verify existence
    const [application] = await db.select()
        .from(applications)
        .where(eq(applications.id, application_id))
        .limit(1);
    if (!application) throw new Error(`Application ${application_id} not found`);

    // Handle location conditions
    if (config.condition.type === 'location' && config.condition.location) {
        const [targetStage] = await db.select()
            .from(stages)
            .where(and(
                eq(stages.job_id, application.job_id!),
                eq(stages.id, newStageId)
            ))
            .limit(1);
        if (!targetStage) throw new Error(`Target stage ${newStageId} not found for this job`);

        await db.update(applications)
            .set({ current_stage_id: newStageId })
            .where(eq(applications.id, application_id));
    }
};
