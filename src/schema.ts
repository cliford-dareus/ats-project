import {z} from "zod";

export const JOB_STAGES = ['New Candidate', 'Screening', 'Phone Interview', 'Interview', 'Offer'] as const;
export const FILE_TYPES = ['RESUME', 'COVER_LETTER', 'OFFER_LETTER', "OTHER"] as const;

export type JOB_ENUM = 'New Candidate'| 'Screening'| 'Phone Interview'| 'Interview'| 'Offer' | null;

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
    }).optional(),
    candidate_file: z.object({
        resume: z.object({
            type: z.enum(FILE_TYPES),
            url: z.string(),
        }),
        cover_letter: z.object({
            type: z.enum(FILE_TYPES),
            url: z.string(),
        })
    }),
    candidate: z.string().nullish(),
    job: z.string().nullish(),
});

export const filterJobType = z.object({
    location: z.string().or(z.array(z.string())).optional(),
    keywords: z.array(z.string()).optional(),
    department: z.array(z.string()).optional(),
    status: z.string().or(z.array(z.string())).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
});

export const filterApplicationsType = z.object({
    keywords: z.array(z.string()).optional(),
    stages: z.number().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
})