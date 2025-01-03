import {applications, attachments, candidates, stages} from "@/drizzle/schema";
import {db} from "@/drizzle/db";
import {and, eq} from "drizzle-orm";
import {CACHE_TAGS, revalidateDbCache} from "@/lib/cache";

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

export const get_candidates_wwith_stages = async () => {
    const h = await db.select({

    }).from(candidates)
        .leftJoin()
}