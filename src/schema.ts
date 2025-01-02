import {z} from "zod";

export const JOB_STAGES = ['New Candidate', 'Screening', 'Phone Interview', 'Offer'] as const;


export const formSchema = z.object({
    jobInfo: z.object({
        job_name: z.string(),
        job_description: z.string(),
        job_location: z.string(),
        salary_up_to: z.string(),
    }).required(),
    jobTechnology: z.array(
        z.object({
            technology: z.string(),
            year_of_experience: z.string(),
        })
    ),
    jobStages: z.array(
        z.object({
            stage_name: z.enum(JOB_STAGES),
            stage_assign_to: z.string(),
        })),
    jobOptional: z.object({
        job_effective_date: z.date().optional(),
        job_agency: z.string().optional(),
    })
});

export const techSchema = z.object({
    technology: z.string(),
    year_of_experience: z.string(),
});

export const stageSchema = z.object({
    stage_name: z.string(),
    stage_assign_to: z.string(),
});


export const candidateForm = z.object({
    candidate_info: z.object({
        first_name: z.string(),
        last_name: z.string(),
        email: z.string(),
        phone: z.string(),
        location: z.string(),
    }).nullish(),
    candidate_file: z.object({
        resume: z.array(z.object({})),
        cover_letter: z.array(z.object({}))
    }),
    candidate: z.string().nullish(),
    job: z.string().nullish(),
})