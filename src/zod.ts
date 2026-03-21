import {z} from "zod";

export const JOB_STAGES = ['New Candidate', 'Screening', 'Phone Interview', 'Interview', 'Offer', 'Applied' , 'Drafted'] as const;
export const FILE_TYPES = ['RESUME', 'COVER_LETTER', 'OFFER_LETTER', "OTHER"] as const;
export const CANDIDATE_STATUS = ['Active', 'Rejected', 'Hired'] as const;
export const JOB_STATUS = ["OPEN", "CLOSED", "DRAFT", "ARCHIVED", "PENDING"] as const;

export type JOB_ENUM = 'New Candidate' | 'Screening' | 'Phone Interview' | 'Interview' | 'Offer' | 'Applied' | 'Drafted';
export type CANDIDATE_ENUM = 'Active' | 'Rejected' | 'Hired';

export const applicationFormSchema = z.object({
    candidate_info: z.object({
        first_name: z.string(),
        last_name: z.string(),
        email: z.string(),
        phone: z.string().optional(),
        location: z.string().optional(),
    }).nullish(),
    file: z.object({
        file_: z.instanceof(File),
        file_type: z.enum(FILE_TYPES).default("RESUME")
    }).nullish(),
    candidate: z.string().nullish(),
    job: z.number(),
});

export const newCandidateFormSchema = z.object({
    name: z.string(),
    email: z.string().email({message: "Please enter a valid email address"}),
    phone: z.string(),
    location: z.string(),
    resume: z.string().optional(),
});

export const departmentSchema = z.object({
    departments: z.array(z.string()),
    orgId: z.string()
});

// FILTER SCHEMA
export const filterJobSchema = z.object({
    location: z.string().or(z.array(z.string())).optional(),
    keywords: z.array(z.string()).optional(),
    department: z.array(z.string()).optional(),
    salary: z.array(z.string()).optional(),
    organization: z.string(),
    status: z.string().or(z.array(z.string())).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
});

export const filterApplicationsSchema = z.object({
    keywords: z.array(z.string()).optional(),
    stages: z.number().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    organization: z.string(),
});

export const filterCandidateSchema = z.object({
    name: z.string().optional(),
    limit: z.number(),
    offset: z.number(),
});

// TRIGGER SCHEMA
export const locationTriggerSchema = z.object({
    location: z.string().min(1, 'Location is required'),
    stage: z.enum(JOB_STAGES, { message: 'Please select a valid stage' }),
    delay: z.number().min(1, 'Delay must be at least 1'),
    delayFormat: z.enum(['minutes', 'hours', 'days'], { message: 'Select a delay unit' }),
});

export const experienceTriggerSchema = z.object({
    experience: z.number(),
    stage: z.enum(JOB_STAGES),
    delay: z.number().min(1, 'Delay must be at least 1'),
    delayFormat: z.enum(['minutes', 'hours', 'days'], { message: 'Select a delay unit' }),
});

export const SmartEmailTriggerSchema = z.object({
    email: z.string(),
    template: z.string(),
    delay: z.number(),
    delayFormat: z.enum(['minutes', 'hours', 'days'], { message: 'Select a delay unit' })
});

// JOB LISTING SCHEMA
export const updateJobSchema = z.object({
    job_name: z.string(),
    job_description: z.string(),
    job_location: z.string(),
    salary_up_to: z.string(),
    department: z.string(),
    type: z.string(),
    status: z.enum(JOB_STATUS)
});

export const jobFormSchema = z.object({
    jobInfo: z.object({
        job_name: z.string(),
        job_description: z.string(),
        job_location: z.string(),
        department: z.string(),
        organization: z.string(),
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
            color: z.string(),
            need_schedule: z.boolean().optional(),
        })),
    jobOptional: z.object({
        job_effective_date: z.date().optional(),
        job_agency: z.string().optional(),
    }),
    userId: z.string().nullish(),
});

export const jobTechSchema = z.object({
    technology: z.string(),
    year_of_experience: z.string(),
});

export const jobStageSchema = z.object({
    stage_name: z.enum(JOB_STAGES),
    stage_assign_to: z.string(),
    color: z.string(),
    need_schedule: z.boolean().optional(),
});

// NEW JOB STEPS SCHEMA
export const stepOneSchema = z.object({
    job_name: z.string(),
    job_description: z.string(),
    job_location: z.string(),
    salary_up_to: z.string(),
});

export const stepTwoSchema = z.array(
    z.object({
        technology: z.string(),
        year_of_experience: z.string(),
    })
);

export const stepThreeSchema = z.array(
    z.object({
        stage_name: z.enum(JOB_STAGES),
        stage_assign_to: z.string(),
        color: z.string(),
        need_schedule: z.boolean().optional(),
    })
);

// ORGANIZATION SCHEMA
export const organizationSchema = z.object({
    clerk_id: z.string(),
    name: z.string().min(2).max(100),
});

export const inviteMemberSchema = z.object({
  organizationId: z.string(),
  inviterUserId: z.string(),
  emailAddress: z.string(),
  role: z.string(),
  redirectUrl: z.string()
});
