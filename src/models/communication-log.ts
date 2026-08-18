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
  type: CommunicationType;
  status: CommunicationStatus;
  to: string;
  toName?: string;
  from: string;
  subject: string;
  body: string;
  templateId?: string;
  candidateId?: number;
  applicationId?: number;
  jobId?: number;
  resendId?: string;
  error?: string;
  sentBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationLogSchema = new mongoose.Schema<CommunicationLogInterface>(
  {
    organizationId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "manual",
        "application_confirmation",
        "interview_invite",
        "interview_reminder",
        "rejection",
        "information_request",
        "offer",
        "other",
      ],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["sent", "failed", "draft"],
      default: "sent",
    },
    to: { type: String, required: true },
    toName: { type: String },
    from: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    templateId: { type: String },
    candidateId: { type: Number },
    applicationId: { type: Number },
    jobId: { type: Number },
    resendId: { type: String },
    error: { type: String },
    sentBy: { type: String },
  },
  { timestamps: true }
);

CommunicationLogSchema.index({ organizationId: 1, createdAt: -1 });

const CommunicationLog =
  mongoose.models.CommunicationLog ||
  mongoose.model("CommunicationLog", CommunicationLogSchema);

export default CommunicationLog;
