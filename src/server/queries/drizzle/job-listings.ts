import {
  applications,
  attachments,
  candidates,
  interviews,
  job_listings,
  job_technologies,
  stages,
  technologies,
  triggers,
} from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { and, eq, inArray, sql, SQL } from "drizzle-orm";
import {
  CACHE_TAGS,
  dbCache,
  getGlobalTag,
  getIdTag,
  revalidateDbCache,
} from "@/lib/cache";
import { z } from "zod";
import { filterJobType, formSchema, JOB_STAGES } from "@/zod";

interface FilterInterface extends z.infer<typeof filterJobType> {
  organization: string;
}

export const create_job_listing = async (
  data: z.infer<typeof formSchema> & {
    userId: string | null;
  },
) => {
  return await db.transaction(async (trx) => {
    const [inserted_job] = await trx
      .insert(job_listings)
      .values({
        name: data.jobInfo.job_name,
        location: data.jobInfo.job_location,
        salary_up_to: data.jobInfo.salary_up_to,
        description: data.jobInfo.job_description,
        createdBy: data.userId!,
        department: Number(data.jobInfo.department),
        organization: data.jobInfo.organization,
      })
      .$returningId();

    if (!inserted_job) {
      trx.rollback();
    }

    const techs = await trx
      .insert(technologies)
      .values(
        data.jobTechnology.map((item) => ({
          name: item.technology,
          years_experience: Number(item.year_of_experience),
        })),
      )
      .$returningId();

    for (const tech of techs) {
      await trx.insert(job_technologies).values({
        id: tech.id * 2,
        job_id: inserted_job.id,
        technology_id: tech.id,
      });
    }

    await trx.insert(stages).values(
      data.jobStages.map((item, i) => ({
        job_id: inserted_job.id,
        stage_name: item.stage_name,
        stage_order_id: i,
        assign_to: "sss",
        need_schedule: item.need_schedule,
        color: item.color,
      })),
    );

    revalidateDbCache({
      tag: CACHE_TAGS.jobs,
      // userId: newProduct.userId,
      id: String(inserted_job.id),
    });

    return inserted_job;
  });
};

export const get_job_listings_stages = (jobId: number) => {
  const cacheFn = dbCache(get_job_listings_stages_db, {
    tags: [getIdTag(String(jobId), CACHE_TAGS.stages)],
  });

  return cacheFn(jobId);
};

export const get_all_job_listings = (filter: FilterInterface) => {
  const cacheFn = dbCache(get_all_job_listings_db, {
    tags: [getGlobalTag(CACHE_TAGS.jobs)],
  });
  return cacheFn(filter);
};

// Move to applications(get_job_application_by_id)
export const get_job_by_id = (jobId: number) => {
  const cacheFn = dbCache(get_job_by_id_db, {
    tags: [getGlobalTag(CACHE_TAGS.applications)],
  });
  return cacheFn(jobId);
};

export const get_job_by_id_db = async (jobId: number) => {
  const jobListingData = await db
    .select({
      jobListing: job_listings, // Select all fields from the job_listings table
      application: applications, // Select all fields from the applications table
      candidate: candidates, // Select all fields from the candidates table
      interview: interviews, // Select all fields from the interviews table
      attachment: attachments, // Select all fields from the attachments table
      stage: stages,
    })
    .from(job_listings)
    .leftJoin(applications, eq(applications.job_id, job_listings.id))
    .leftJoin(candidates, eq(candidates.id, applications.candidate))
    .leftJoin(attachments, eq(candidates.id, attachments.candidate_id))
    .leftJoin(interviews, eq(applications.id, interviews.applications_id))
    .leftJoin(stages, eq(applications.current_stage_id, stages.id))
    .where(eq(job_listings.id, jobId));
  
  const jobListing = {
    job_id: jobListingData[0].jobListing.id,
    job_name: jobListingData[0].jobListing.name,
    job_status: jobListingData[0].jobListing.status,
    job_created_at: jobListingData[0].jobListing.created_at,
    job_description: jobListingData[0].jobListing.description,
    applications: [],
  };

  const applicationMap = new Map<number, any>();

  for (const row of jobListingData) {
    if (row.application) {
      let application = applicationMap.get(row.application.id);

      if (!application) {
        // Create a new application object if it doesn't exist in the map
        application = {
          id: row.application.id,
          application_id: row.application.id,
          job_id: row.jobListing.id,
          application_updated_at: row.application.updated_at,
          stageName: row.stage?.stage_name,
          stage_order_id: row.stage?.stage_order_id,
          candidate: row.candidate
            ? {
                id: row.candidate.id,
                name: row.candidate.name,
                email: row.candidate.email,
                phone: row.candidate.phone,
                cv_path: row.candidate.cv_path,
                status: row.candidate.status,
                created_at: row.candidate.created_at,
                updated_at: row.candidate.updated_at,
                interview: [],
              }
            : {}, // Candidate object or empty object
        };
        applicationMap.set(row.application.id, application);
        jobListing.applications.push(application);
      }

      // Add interview data to the candidate if not already added
      if (row.interview && application.candidate.interview) {
        if (
          !application.candidate.interview.some(
            (int) => int.id === row.interview?.id,
          )
        ) {
          application.candidate.interview.push(row.interview);
        }
      }

      // Add attachment data to the candidate if not already added
      if (row.attachment && application.candidate.attachment) {
        if (
          !application.candidate.attachment.some(
            (att) => att.id === row.attachment?.id,
          )
        ) {
          application.candidate.attachment.push(row.attachment);
        }
      }
    }
  }

  return [jobListing];
};

export const get_all_job_listings_db = async (filter: FilterInterface) => {
  const filters: SQL[] = [];

  if (filter.location)
    filters.push(inArray(job_listings.location, filter.location as string[]));
  // if(filter.department) filters.push(inArray(job_listings.department, filter.department as string[]))
  // if(filter.keywords) filters.push(inArray(job_listings.keywords, filter.keywords as string[]))
  // if(filter.status) filters.push(eq(job_listings.status, filter.status))

  const jobListings = await db
    .select({
      id: job_listings.id,
      name: job_listings.name,
      location: job_listings.location,
      status: job_listings.status,
      department: job_listings.department,
      organization: job_listings.organization,
      created_at: job_listings.created_at,
      updated_at: job_listings.updated_at,
      createdBy: job_listings.createdBy,
      candidatesCount: db.$count(
        applications,
        eq(applications.job_id, job_listings.id),
      ),
    })
    .from(job_listings)
    .where(and(...filters, eq(job_listings.organization, filter.organization)))
    .limit(filter.limit!)
    .offset(filter.offset!);

  const len = jobListings.length;
  return [len, jobListings];
};

export const get_job_listings_stages_db = async (jobId: number) => {
  return await db
    .select({
      id: stages.id,
      assign_to: stages.assign_to,
      color: stages.color,
      job_id: stages.job_id,
      need_schedule: stages.need_schedule,
      stage_name: stages.stage_name,
      stage_order_id: stages.stage_order_id,
      trigger: sql<string>`COALESCE(JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', ${triggers.id},'action_type', ${triggers.action_type},'config', ${triggers.config})
                ), '[]')`.as("trigger"),
    })
    .from(stages)
    .leftJoin(triggers, eq(triggers.stage_id, stages.id))
    .where(eq(stages.job_id, jobId))
    .groupBy(stages.id);
};

// export const update_job_listing = async (data: Partial<filterJobType>) => {
// }

// export const delete_job_listing = async (data) => {
// }
