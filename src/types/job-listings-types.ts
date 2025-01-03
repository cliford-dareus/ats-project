import {candidates, job_listings} from "@/drizzle/schema";

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
    candidatesCount: number;
}

export type candidatesResponseType = {
    id: number
    name: string
    email: string
    phone: string
    cv_path: string
    status: "Active" | "Rejected" | "Hired" | null
};

export type JobListingWithCandidatesType = {
    job_id: number
    name: string
    location: string
    created_at: Date
    updated_at: Date
    createdBy: string
    application_id: number | null
    stageName: "New Candidate" | "Screening" | "Phone Interview" | "Offer" | null;
    stage_order_id: number | null
}

