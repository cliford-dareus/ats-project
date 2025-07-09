"use server"

import mongodb from "@/lib/mongodb";
import Attachment from "@/models/attachments";

export const get_candidate_attachments = async (candidateId: number) => {
    try {
        await mongodb();

        const attachments = await Attachment.find({candidate_id: candidateId});
        return JSON.stringify(attachments);
    } catch (error) {
        console.log(error);
        return JSON.stringify([]);
    }
};
