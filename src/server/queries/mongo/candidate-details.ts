"use server";

import { db } from "@/drizzle/db";
import { candidates } from "@/drizzle/schema";
import mongodb from "@/lib/mongodb";
import { eq } from "drizzle-orm";
import CandidateDetails from "@/models/candidate-details";

export const create_candidate_details = async (data: any) => {
    try {
        await mongodb();

        const experience = await CandidateDetails.create(data);
        return JSON.stringify(experience);
    } catch (error) {
        console.log(error);
    }
};

export const get_candidate_details = async (candidate_id: number) => {
    try {
        await mongodb();

        const candidate = await db.select().from(candidates).where(eq(candidates.id, candidate_id))
        if (!candidate) throw new Error("Candidate not found");

        const details = await CandidateDetails.find({ candidate_id: candidate_id });
        return JSON.stringify({
            resumeSummary: details[0]?.resumeSummary,
            skills: details[0]?.skills,
            experience: details[0]?.experience,
            education: details[0]?.education,
        });
    } catch (error) {
        console.log(error);
        return JSON.stringify([]);
    }
};

export const update_candidate_details = async (candidate_id: number, data: any) => {
    try {
        await mongodb();

        const updated = await CandidateDetails.updateOne({ candidate_id: candidate_id }, data);
        return JSON.stringify(updated);
    } catch (error) {
        console.log(error);
        return JSON.stringify([]);
    }
};

export const delete_candidate_details = async (candidate_id: number) => {
    try {
        await mongodb();

        const deleted = await CandidateDetails.deleteOne({ candidate_id: candidate_id });
        return JSON.stringify(deleted);
    } catch (error) {
        console.log(error);
        return JSON.stringify([]);
    }
};
