import { z } from "zod";

export const JOB_STAGES = z.enum(['New Candidate', 'Screening', 'Phone Interview', 'Interview', 'Offer', 'Applied', 'Drafted'] as const);
export const FILE_TYPES = ['RESUME', 'COVER_LETTER', 'OFFER_LETTER', "OTHER"] as const;

export const CANDIDATE_STATUS = z.enum(['ACTIVE', 'REJECTED', 'HIRED'] as const);
export const JOB_STATUS = z.enum(["OPEN", "CLOSED", "DRAFT", "ARCHIVED", "PENDING"] as const);
export const JOB_TYPE = z.enum(['FULL_TIME', 'PART_TIME', 'REMOTE', 'INTERNSHIP', 'CONTRACT'] as const);
export const APPLICATION_STATUS = z.enum(['UNREAD', 'REVIEWING', 'INTERVIEWING', 'CLOSED'] as const);

export type JOB_ENUM = 'New Candidate' | 'Screening' | 'Phone Interview' | 'Interview' | 'Offer' | 'Applied' | 'Drafted';
export type CANDIDATE_ENUM = 'Active' | 'Rejected' | 'Hired';

//  FORM SCHEMAS
export const jobFormSchema = z.object({
    jobInfo: z.object({
        job_name: z.string(),
        job_description: z.string(),
        job_location: z.string(),
        department: z.string(),
        job_type: JOB_TYPE,
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
            stage_name: JOB_STAGES,
            stage_assign_to: z.number(),
            color: z.string(),
            need_schedule: z.boolean().optional(),
        })),
    jobOptional: z.object({
        job_effective_date: z.date().optional(),
        job_agency: z.string().optional(),
    }),
    userId: z.number().nullish(),
});

export const updateJobListingSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    department: z.string().optional(),
    organization: z.string().optional(),
    salary_up_to: z.string().optional(),
    status: JOB_STATUS.optional(),
    type: JOB_TYPE.optional(),
    jobId: z.number(),
});

const personalInfoSchema = z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zipCode: z.string().min(5, "Zip code is required"),
    portfolioUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

const experienceSchema = z.object({
    company: z.string().min(2, "Company name is required"),
    position: z.string().min(2, "Position is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    current: z.boolean(),
    description: z.string().min(10, "Description should be more detailed"),
});

const educationSchema = z.object({
    school: z.string().min(2, "School name is required"),
    degree: z.string().min(2, "Degree is required"),
    fieldOfStudy: z.string().min(2, "Field of study is required"),
    graduationDate: z.string().min(1, "Graduation date is required"),
});

const referenceSchema = z.object({
    name: z.string().min(2, "Name is required"),
    relationship: z.string().min(2, "Relationship is required"),
    company: z.string().min(2, "Company is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number is required"),
});

export const applicationSchema = z.object({
    personalInfo: personalInfoSchema,
    workExperience: z.array(experienceSchema).min(1, "At least one experience item is required"),
    education: z.array(educationSchema).min(1, "At least one education item is required"),
    references: z.array(referenceSchema).optional(),
    additionalInfo: z.object({
        coverLetter: z.string().optional(),
        referralSource: z.string().optional(),
        expectedSalary: z.string().optional(),
        earliestStartDate: z.string().optional(),
    }),
});

export const applicationFormSchema = z.object({
    personalInfo: personalInfoSchema,
    workExperience: z.array(experienceSchema).min(1, "At least one experience item is required"),
    education: z.array(educationSchema).min(1, "At least one education item is required"),
    references: z.array(referenceSchema).optional(),
    additionalInfo: z.object({
        coverLetter: z.string().optional(),
        referralSource: z.string().optional(),
        expectedSalary: z.string().optional(),
        earliestStartDate: z.string().optional(),
    }),
    file: z.object({
        file_: z.instanceof(File),
        // file_type: z.enum(FILE_TYPES).default("RESUME")
    }).nullish(),
    candidate: z.string().nullish(),
    jobId: z.number(),
    subdomain: z.string(),
});

export const updateApplicationSchema = z.object({
    applicationId: z.number(),
    job_id: z.number().optional(),
    current_stage_id: z.number().optional(),
    candidate: z.number().optional(),
    can_contact: z.boolean().optional(),
    position_in_stage: z.number().optional(),
    organization: z.string().optional(),
    subdomain: z.string().optional(),
});

export const updateApplicationStageSchema = z.object({
    applicationId: z.number(),
    new_stage_id: z.number(),
});

export const moveAndReorderApplicationSchema = z.object({
    applicationId: z.number(),
    newStageId: z.number(),
    sourceStageId: z.number().optional(),
    targetOrders: z.array(z.object({ id: z.number(), position: z.number() })),
    sourceOrders: z.array(z.object({ id: z.number(), position: z.number() })).optional(),
});

export const newCandidateFormSchema = z.object({
    name: z.string(),
    email: z.string().email({ message: "Please enter a valid email address" }),
    phone: z.string(),
    location: z.string(),
    resume: z.string().optional(),
    organization: z.string(),
    subdomain: z.string(),
});

export const updateCandidateSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().email({ message: "Please enter a valid email address" }).optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    cv_path: z.string().optional(),
    status: CANDIDATE_STATUS.optional(),
    profession: z.string().optional(),
    subdomain: z.string().optional(),
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
    status: JOB_STATUS.or(z.array(JOB_STATUS)).optional(),
    type: z.string().or(z.array(z.string())).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
});

export const filterApplicationsSchema = z.object({
    keywords: z.array(z.string()).optional(),
    stages: z.any(),
    // status: APPLICATION_STATUS.or(z.array(APPLICATION_STATUS)).optional(),
    location: z.string().or(z.array(z.string())).optional(),
    department: z.array(z.string()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    organization: z.string(),
});

export const filterCandidateSchema = z.object({
    name: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    status: CANDIDATE_STATUS.or(z.array(CANDIDATE_STATUS)).optional(),
    location: z.string().or(z.array(z.string())).optional(),
    experience: z.string().or(z.array(z.string())).optional(),
    organization: z.string(),
    limit: z.number(),
    offset: z.number(),
});

// TRIGGER SCHEMA
export const locationTriggerSchema = z.object({
    location: z.string().min(1, 'Location is required'),
    stage: JOB_STAGES,
    delay: z.number().min(1, 'Delay must be at least 1'),
    delayFormat: z.enum(['minutes', 'hours', 'days'], { message: 'Select a delay unit' }),
});

export const experienceTriggerSchema = z.object({
    experience: z.number(),
    stage: JOB_STAGES,
    delay: z.number().min(1, 'Delay must be at least 1'),
    delayFormat: z.enum(['minutes', 'hours', 'days'], { message: 'Select a delay unit' }),
});

export const SmartEmailTriggerSchema = z.object({
    subject: z.string(),
    template: z.string(),
    body: z.string(),
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
    status: JOB_STATUS
});

export const jobTechSchema = z.object({
    technology: z.string(),
    year_of_experience: z.string(),
});

export const jobStageSchema = z.object({
    stage_name: JOB_STAGES,
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
    job_type: JOB_TYPE,
    department: z.string(),
});

export const stepTwoSchema = z.array(
    z.object({
        technology: z.string(),
        year_of_experience: z.string(),
    })
);

export const stepThreeSchema = z.array(
    z.object({
        stage_name: JOB_STAGES,
        stage_assign_to: z.string(),
        color: z.string(),
        need_schedule: z.boolean().optional(),
    })
);

// ORGANIZATION SCHEMA
export const organizationSchema = z.object({
    clerk_id: z.string(),
    name: z.string().min(3).max(100),
    subdomain: z.string().min(3).max(100),
});

export const inviteMemberSchema = z.object({
    organizationId: z.string(),
    inviterUserId: z.string(),
    emailAddress: z.string(),
    role: z.string(),
    redirectUrl: z.string()
});
