'use server';

import {update_candidate_stage} from "@/server/db/candidates";

export const update_candidate_stage_action = async (data: { candidateId: number, current_stage_id: number }) => {
    // Check user role and auth first
    try {
        await update_candidate_stage(data)
    } catch (err) {
        return err;
    }
}