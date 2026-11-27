// Server-only query module (deliberately not "use server"). Callers must check org ownership.

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

/**
 * Delete the Mongo attachment docs for a candidate (candidate delete
 * cascade — the upload route writes these docs; they have no FK to the
 * MySQL candidate row). Callers must already have verified the candidate
 * belongs to the session org. The R2 blobs themselves are not deleted.
 */
export const delete_candidate_attachments = async (candidateId: number) => {
    try {
        await mongodb();

        return await Attachment.deleteMany({ candidate_id: candidateId });
    } catch (error) {
        console.log(error);
        return null;
    }
};
