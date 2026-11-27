import mongoose from "mongoose";

export type NotificationKind = "mention" | "automation" | "interview_confirmed" | "interview_declined" | "interview_expired" | "system";

interface NotificationInterface extends mongoose.Document {
    organization_id: string;
    user_id: string;          // recipient (Clerk id)
    kind: NotificationKind;
    title: string;
    body: string;
    link?: string;            // app-relative path, e.g. /applications/12
    actor_id?: string;
    actor_name?: string;
    read_at?: Date | null;
    createdAt: Date;
}

const NotificationSchema = new mongoose.Schema<NotificationInterface>(
    {
        organization_id: { type: String, required: true },
        user_id: { type: String, required: true },
        kind: { type: String, required: true },
        title: { type: String, required: true, maxlength: 200 },
        body: { type: String, default: "", maxlength: 500 },
        link: { type: String },
        actor_id: { type: String },
        actor_name: { type: String },
        read_at: { type: Date, default: null },
    },
    { timestamps: true }
);

NotificationSchema.index({ organization_id: 1, user_id: 1, read_at: 1, createdAt: -1 });

const Notification =
    mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

export default Notification;
