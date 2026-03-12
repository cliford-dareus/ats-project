import { db } from "@/drizzle/db";
import { candidates } from "@/drizzle/schema";
import mongodb from "@/lib/mongodb";
import Experience from "@/models/experience";
import { eq } from "drizzle-orm";

export const create_candidate_experience = async (data: any) => {
    try {
        await mongodb();

        const experience = await Experience.create(data);
        return JSON.stringify(experience);
    } catch (error) {
        console.log(error);
    }
};

export const get_candiate_experience = async (candidate_id: number) => {
    try {
        await mongodb();

        const candidate = await db.select().from(candidates).where(eq(candidates.id, candidate_id))
        if (!candidate) throw new Error("Candidate not found");

        const experience = await Experience.find({candidate_id});
        return JSON.stringify(experience);
    } catch (error) {
        console.log(error);
        return JSON.stringify([]);
    }
};
