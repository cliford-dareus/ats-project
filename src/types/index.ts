import { CANDIDATE_STATUS, JOB_ENUM, JOB_STAGES, JOB_STATUS, JOB_TYPE } from "@/zod";

// RESPONSE TYPES
export type JobResponseType = {
    id: number;
    name: string;
    location: string;
    description: string;
    salary: string;
    createdBy: string;
    created_at: Date;
    type: typeof JOB_TYPE._type;
    updated_at: Date;
    organization: string;
    department: string;
    status: typeof JOB_STATUS._type;
    candidatesCount: number;
};

export type CandidatesResponseType = {
    id: number;
    name: string;
    email: string;
    phone: string;
    cv_path: string;
    status: typeof CANDIDATE_STATUS._type | null;
    created_at: Date;
    updated_at: Date;
    applicationsCount: number;
    attachmentsCount: number;
};

export type ApplicationResponseType = {
    id: number;
    candidate_id: number;
    candidate_name: string;
    candidate_email: string;
    candidate_phone: string;
    can_contact: boolean;
    status: JOB_ENUM;
    job_apply: string;
    job_id: number;
    type: string;
    location: string;
    department: string;
    current_stage: JOB_ENUM;
    assign_to: string;
    interview: InterviewType;
    apply_date: Date;
    updated_at: Date;
};

export type StageResponseType = {
    id: number;
    job_id: number;
    stage_name: typeof JOB_STAGES._type | null
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

export type NoteResponseType = {
    notes: NoteType[];
    total: number;
};

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
export type InterviewType = {
    id: number,
    application_id: number,
    candidate_id: number,
    interview_date: Date,
    interview_location: string,
    locations: string;
    type: "Video" | "Phone" | "Onsite";
    link: string;
};

export interface ApplicationType {
    id: number;
    created_at: Date;
    updated_at: Date;
    job_id: number;
    stage: typeof JOB_STAGES._type | null | undefined;
    current_stage_id?: number | null;
    stage_order_id?: number | null;
    position_in_stage?: number;
    candidate: CandidateType;
    interview: InterviewType[];
};

export type JobListingWithCandidatesType = {
    job_id: number
    job_name: string
    job_location: string
    job_status: 'OPEN' | 'CLOSED' | 'DRAFT' | 'ARCHIVED' | 'PENDING'
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

export interface CandidateExperience {
    company: string;
    position: string;
    period: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    totalExperience: number;
}

export interface CandidateEducation {
    school: string;
    degree: string;
    field_of_study: string;
    graduation_date: string;
}

export interface CandidateReference {
    name: string;
    email: string;
    company: string;
    relationship: string;
    phone: string;
}

export interface CandidateType {
    id: number;
    name: string;
    email: string;
    phone: string;
    cv_path: string;
    role?: string;
    location?: string;
    status: typeof CANDIDATE_STATUS._type | null;
    created_at: Date;
    updated_at: Date;
    interview?: InterviewType[];
    skills?: string[];
    experience?: CandidateExperience[];
    education?: string[];
};

export interface Application {
    application_id: number;
    job_id: number;
    updated_at: Date;
    stageName?: JOB_ENUM | null | undefined;
    stage_order_id?: number;
    candidate: CandidateType;
};

export interface JobExperienceType {
    id: number;
    name: string;
    years_experience: number | null;
};

export interface JobListingType {
    job_id: number;
    job_name: string;
    job_created_at: Date;
    job_description: string;
    job_department: string;
    job_status: typeof JOB_STATUS._type | null;
    job_type: typeof JOB_TYPE._type | null;
    job_location: string;
    job_technologies: JobExperienceType[];
    applications: ApplicationType[];
    job_updated_at: Date;
};

export interface CandidateWithDetails {
    candidate: CandidateType;
    application: ApplicationType[] | null;
    stage: StageResponseType[] | null;
    job_listing: JobListingType[] | null;
    interview: InterviewType[] | null;
    scoreCard: string[] | null;
};

export interface FormErrors {
    [key: string]: string | undefined;
};

export type UserType = {
    name: string;
    image: string;
    email: string;
    age: number;
};

export type NoteType = {
    _id: string;
    text: string;
    type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    note_id: string;
    note_type: string;
    created_at: Date;
    updated_at: Date;
    author: string;
};