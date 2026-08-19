import mongoose from "mongoose";

export type CommunicationStatus = "sent" | "failed" | "draft";
export type CommunicationType =
    | "manual"
    | "application_confirmation"
    | "interview_invite"
    | "interview_reminder"
    | "rejection"
    | "information_request"
    | "offer"
    | "other";

interface CommunicationLogInterface extends mongoose.Document {
    organizationId: string;
    sender: 'candidate' | 'recruiter' | 'team' | 'system';
    authorName: string;
    authorAvatar?: string;
    text: string;
    channel: 'Email' | 'SMS' | 'Internal Note';
    read?: boolean;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CommunicationLogSchema = new mongoose.Schema<CommunicationLogInterface>(
    {
        organizationId: { type: String, required: true, index: true },
        sender: { type: String, required: true },
        authorName: { type: String, required: true },
        authorAvatar: { type: String },
        text: { type: String, required: true },
        channel: { type: String, required: true },
        read: { type: Boolean, default: false },
        error: { type: String },
    },
    { timestamps: true }
);

CommunicationLogSchema.index({ organizationId: 1, createdAt: -1 });

const CommunicationLog =
    mongoose.models.CommunicationLog ||
    mongoose.model("CommunicationLog", CommunicationLogSchema);

export default CommunicationLog;
