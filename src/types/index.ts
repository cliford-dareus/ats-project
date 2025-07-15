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
};

export type CandidatesResponseType = {
    id: number;
    name: string;
    email: string;
    phone: string;
    cv_path: string;
    status: "Active" | "Rejected" | "Hired" | null;
    created_at: Date;
    updated_at: Date;
    applicationsCount: number;
    attachmentsCount: number;
};

export type InterviewType = {
    id: number,
    application_id: number,
    candidate_id: number,
    interview_date: Date,
    interview_location: string,
};

export interface ApplicationType {
  id: number;
  application_id: number;
  application_created_at: Date;
  application_updated_at: Date;
  job_id: number;
  stageName: "New Candidate" | "Screening" | "Phone Interview" | "Interview" | "Offer" | 'Applied' | null | undefined;
  stage_order_id: number | undefined;
  candidate: Candidate;
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
};

export type ApplicationResponseType = {
    id: number;
    candidate_id: number;
    candidate_name: string;
    candidate_status: CANDIDATE_ENUM;
    job_apply: string;
    job_id: number;
    location: string;
    current_stage: JOB_ENUM;
    assign_to: string;
    created_at: Date;
    updated_at: Date;
};

export  type StageResponseType = {
    id: number;
    job_id: number;
    stage_name: "New Candidate" | "Screening" | "Phone Interview" | "Interview" | "Offer" | 'Applied' | null
    stage_order_id: number
    assign_to: string | null
    color: string | null;
    need_schedule: boolean | null;
    trigger: string;
};

export type TriggerResponseType = {
    id: number;
    action_type: string;
    stage_id: number;
    config: Record<string, never>;
    created_at: Date;
    updated_at: Date;
};

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
export interface Candidate {
    id: number;
    name: string;
    email: string;
    phone: string;
    cv_path: string;
    status: CANDIDATE_ENUM | null;
    created_at: Date;
    updated_at: Date;
    interview: any[];
    attachment: any[];
};
export interface Application {
    application_id: number;
    job_id: number;
    application_updated_at: Date;
    stageName?: JOB_ENUM | null | undefined;
    stage_order_id?: number;
    candidate: Candidate;
};
export interface JobListing {
    job_id: number;
    job_name: string;
    job_status: string;
    job_created_at: Date;
    job_description: string;
    applications: Application[];
};
export interface CandidateWithDetails {
    candidates: Candidate;
    applications: Application[] | null;
    stages: StageResponseType[] | null;
    job_listings: JobListing[] | null;
    interviews: InterviewType[] | null;
    scoreCards: any[] | null;
};

export type UserType = {
    name: string;
    image: string;
    email: string;
    age: number;
};

export type NoteType = {
    _id: string;
    content: string;
    type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    note_parent_id: string;
    note_parent_type: string;
    created_at: Date;
    updated_at: Date;
    user: UserType;
};

export type NoteResponseType = {
    notes: NoteType[];
    total: number;
};
