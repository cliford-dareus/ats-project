import {applications, attachments, candidates, interviews, job_listings, scoreCards, stages} from "@/drizzle/schema";
import {db} from "@/drizzle/db";
import {and, eq, SQL} from "drizzle-orm";
import {CACHE_TAGS, dbCache, getGlobalTag, revalidateDbCache} from "@/lib/cache";
import {filterApplicationsType} from "@/schema";
import {z} from "zod";

export const create_application = async (data: any) => {
    const [current_stage] = await db
        .select()
        .from(stages)
        .where(and(eq(stages.job_id, Number(data.job!)), eq(stages.stage_order_id, 0)));

    if (data.candidate == "") {
        console.log("CREATE NEW CANDIDATE");
        try {
            const info = data.candidate_info!
            const file = data.candidate_file as { resume: FileList, cover_letter: FileList }

            const [candidate] = await db.insert(candidates).values({
                name: `${info.first_name} ${info.last_name}`,
                // location: info.location,
                email: info.email,
                phone: info.phone,
                cv_path: 'no path'
            }).$returningId();

            await db.insert(attachments)
                .values({
                    file_name: `${info.first_name} ${file.resume[0].name}`,
                    file_url: "udhsjhdjsh.com",
                    candidate_id: candidate.id,
                    attachment_type: "RESUME"
                })

            const [application] = await db.insert(applications)
                .values({
                    job_id: Number(data.job),
                    candidate: candidate.id,
                    current_stage_id: current_stage.id,
                })

            return application;
        } catch (err) {
            console.log(err);
        }
    }

    const [application] = await db
        .insert(applications)
        .values({
            job_id: Number(data.job),
            candidate: Number(data.candidate),
            current_stage_id: Number(current_stage.id),
        })

    return application;
};

export const update_application_stage = async (data: { candidateId: number, current_stage_id: number }) => {
    await db.update(applications)
        .set({current_stage_id: data.current_stage_id})
        .where(eq(applications.id, data.candidateId))

    revalidateDbCache({
        tag: CACHE_TAGS.candidates,
    })
}

export const get_all_applications = async (filter: z.infer<typeof filterApplicationsType>) => {
    const cacheFn = dbCache(get_all_applications_db, {
        tags: [
            getGlobalTag(CACHE_TAGS.applications)
        ]
    });

    return cacheFn(filter);
}

export const get_candidate_with_stage = async () => {
    const cacheFn = dbCache(get_applications_with_stages_db, {
        tags: [
            getGlobalTag(CACHE_TAGS.stages)
        ]
    });

    return cacheFn();
};

export const get_applications_with_stages_db = async () => {
    return db.select({
        stageId: stages.id,
        stages: stages.stage_name,
        count: db.$count(applications, eq(applications.current_stage_id, stages.id))
    })
        .from(stages)
        .leftJoin(applications, eq(applications.current_stage_id, stages.id));
};

export const get_all_applications_db = async (filter: z.infer<typeof filterApplicationsType>) => {
    const filters: SQL[] = []

    if (filter.stages) filters.push(eq(applications.current_stage_id, filter.stages))
    // if(filter.department) filters.push(inArray(job_listings.department, filter.department as string[]))
    // if(filter.keywords) filters.push(inArray(job_listings.keywords, filter.keywords as string[]))
    // if(filter.status) filters.push(eq(job_listings.status, filter.status))

    const application = await db.select({
        id: candidates.id,
        job_apply: job_listings.name,
        candidate_name: candidates.name,
        candidate_status: candidates.status,
        location: job_listings.location,
        current_stage: stages.stage_name,
        assign_to: stages.assign_to,
        // apply_date: applications.created_at,
        candidatesCount: db.$count(applications, eq(applications.job_id, job_listings.id))
    })
        .from(applications)
        .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
        .leftJoin(candidates, eq(applications.candidate, candidates.id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .where(and(...filters))
        .limit(filter.limit!)
        .offset(filter.offset!)

    const len = application.length

    return [len, application];
}

export const get_user_applications = async (candidateId: number) => {
    return db.select()
        .from(applications)
        .where(eq(applications.candidate, candidateId))
        .leftJoin(scoreCards, eq(scoreCards.applications_id, applications.id))
        .leftJoin(interviews, eq(interviews.applications_id, applications.id))
}

export const add_interview = async ({applicationId, location, start_at, end_at}: {
    applicationId: number,
    location: string,
    start_at: Date,
    end_at: Date
}) => {
    return await db.insert(interviews).values({
        applications_id: applicationId,
        locations: location,
        start_at: start_at,
        end_at: end_at,
    })
}