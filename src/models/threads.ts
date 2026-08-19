import { CANDIDATE_STATUS } from "@/zod";
import mongoose from "mongoose";

interface ThreadInterface extends mongoose.Document {
    organization_id: string;
    candidate_id: number;
    candidate_name: string;
    candidate_avatar: string;
    candidate_role: string;
    candidate_status: typeof CANDIDATE_STATUS._type;
    last_message: string;
    last_timestamp: Date;
    unread_count: number;
    starred: boolean;
    messages: mongoose.Schema.Types.ObjectId[];
}

const ThreadSchema = new mongoose.Schema<ThreadInterface>({
    organization_id: { type: String, required: true },
    candidate_id: { type: Number, required: true },
    candidate_name: { type: String, required: true },
    candidate_avatar: { type: String, required: true },
    candidate_role: { type: String, required: true },
    candidate_status: { type: String, required: true },
    last_message: { type: String, required: true },
    last_timestamp: { type: Date, required: true },
    unread_count: { type: Number, default: 0 },
    starred: { type: Boolean, default: false },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "CommunicationLog" }],
});

ThreadSchema.index({ organization_id: 1, candidate_id: 1, createdAt: -1 });

const Thread =
    mongoose.models.Thread ||
    mongoose.model("Thread", ThreadSchema);

export default Thread;
