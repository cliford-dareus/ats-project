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

        const experience = await CandidateDetails.find({candidate_id});
        return JSON.stringify(experience);
    } catch (error) {
        console.log(error);
        return JSON.stringify([]);
    }
};
