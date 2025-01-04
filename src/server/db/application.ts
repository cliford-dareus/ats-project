import {applications, attachments, candidates, job_listings, stages} from "@/drizzle/schema";
import {db} from "@/drizzle/db";
import {and, eq, SQL} from "drizzle-orm";
import {CACHE_TAGS, dbCache, getGlobalTag} from "@/lib/cache";
import {filterApplicationsType} from "@/schema";
import {z} from "zod";

export const create_application = async (data: any) => {
    // check if user is passing a new candidate or an existing one
    // check if the candidate is in db
    // if not
    // 0 -get the stages for the job stage
    // 1 -create the candidate
    // 2 -create the application
    // 3 -

    if (!data.candidate) {
        const [current_stage] = await db
            .select()
            .from(stages)
            .where(and(eq(stages.job_id, Number(data.job!)), eq(stages.stage_order_id, 0)));

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


};

export const update_application_stage = async (data: { candidateId: number, current_stage_id: number }) => {
    console.log("Updating application stage action", data)

    const [{fieldCount}] = await db.update(applications)
        .set({current_stage_id: data.current_stage_id})
        .where(eq(applications.id, data.candidateId))

    console.log(fieldCount)

    // revalidateDbCache({
    //     tag: CACHE_TAGS.candidates,
    //     id: String(candidates.id),
    // })
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
        job_apply: job_listings.name,
        candidate_name: candidates.name,
        candidatesCount: db.$count(applications, eq(applications.job_id, job_listings.id))
    })
        .from(applications)
        .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
        .leftJoin(candidates, eq(applications.candidate, candidates.id))
        .where(and(...filters))
        .limit(filter.limit!)
        .offset(filter.offset!)

    const len = application.length

    return [len, application];
}