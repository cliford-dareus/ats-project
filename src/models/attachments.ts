import mongoose from 'mongoose';

interface AttachmentInterface extends mongoose.Document {
    file_name: string;
    file_url: string;
    candidate_id: number;
    attachment_type: "RESUME" | "COVER_LETTER" | "OFFER_LETTER" | "OTHER";
    // Clerk org id of the owning tenant, set at upload time (session org).
    // Optional so pre-existing docs still validate; readers should filter
    // by candidate (whose org is verified) and can additionally match this.
    organization_id?: string;
};

const AttachmentSchema = new mongoose.Schema<AttachmentInterface>({
    file_name: { type: String, required: true },
    file_url: { type: String, required: true },
    candidate_id: { type: Number, required: true },
    attachment_type: { type: String, enum: ["RESUME", "COVER_LETTER", "OFFER_LETTER", "OTHER"], required: true },
    organization_id: { type: String, required: false },
});

const Attachment = mongoose.models.Attachment || mongoose.model('Attachment', AttachmentSchema);
export default Attachment;
