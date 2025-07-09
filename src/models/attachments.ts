import mongoose from 'mongoose';

interface AttachmentInterface extends mongoose.Document {
    file_name: string;
    file_url: string;
    candidate_id: number;
    attachment_type: "RESUME" | "COVER_LETTER" | "OFFER_LETTER" | "OTHER";
};

const AttachmentSchema = new mongoose.Schema<AttachmentInterface>({
    file_name: { type: String, required: true },
    file_url: { type: String, required: true },
    candidate_id: { type: Number, required: true },
    attachment_type: { type: String, enum: ["RESUME", "COVER_LETTER", "OFFER_LETTER", "OTHER"], required: true },
});

const Attachment = mongoose.models.Attachment || mongoose.model('Attachment', AttachmentSchema);
export default Attachment;
