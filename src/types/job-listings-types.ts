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

export type filterJobType = {
    location?: string | string[]
    keywords?: string[]
    department?: string[]
    status?: string | string[]
    limit: number
    offset: number
};

export type JobListingWithCandidatesType = {
    job_id: number
    name: string
    location: string
    created_at: Date
    updated_at: Date
    createdBy: string
    candidate_id: number
    stageName: "New Candidate" | "Screening" | "Phone Interview" | "Offer" | null
}

