import {candidates, job_listings} from "@/drizzle/schema";
import {CANDIDATE_ENUM, JOB_ENUM} from "@/zod";

export type JobListingType = typeof job_listings.$inferInsert
export type CandidateType = typeof candidates.$inferInsert

export type JobResponseType = {
    id: number;
    name: string;
    location: string;
    description: string;
    salary_up_to: string;
    createdBy: string;
    created_at: Date;
    updated_at: Date;
    organization: string;
    department: number;
    status: 'OPEN'|'CLOSED'|'DRAFT'|'ARCHIVED'|'PENDING';
    candidatesCount: number;
}

export type CandidatesResponseType = {
    id: number
    name: string
    email: string
    phone: string
    cv_path: string
    status: "Active" | "Rejected" | "Hired" | null
    created_at: Date
    updated_at: Date
};

export type JobListingWithCandidatesType = {
    job_id: number
    job_name: string
    job_location: string
    job_status: 'OPEN'|'CLOSED'|'DRAFT'|'ARCHIVED'|'PENDING'
    job_created_at: Date
    job_updated_at: Date
    job_createdBy: string
    application_id: number | null
    application_updated_at: Date
    stageName: JOB_ENUM
    stage_order_id: number | null
    candidate_name: string | null
    candidate_id: number | null
}

export type ApplicationResponseType = {
    id: number;
    candidate_id: number;
    candidate_name: string;
    candidate_status: CANDIDATE_ENUM;
    job_apply: string;
    location: string;
    current_stage: JOB_ENUM;
    assign_to: string;
    created_at: Date;
    updated_at: Date;
}

export  type StageResponseType = {
    id: number
    job_id: number
    stage_name: "New Candidate" | "Screening" | "Phone Interview" | "Interview" | "Offer" | 'Applied' | null
    stage_order_id: number
    assign_to: string | null
    color: string
    need_schedule: boolean
    trigger: any
}

export type TriggerResponseType = {
    id: number;
    action_type: string;
    stage_id: number;
    config: Record<string, never>;
    created_at: Date;
    updated_at: Date;
}

export type ExtractResponseType = {
    Name: string,
    "Contact Information": {
        Email: string,
        Phone: string,
        Location: string
    }
    Skills: string[],
    "Work Experience": string[],
    Education: string[]
};

export interface FormErrors {
    [key: string]: string | undefined;
};


