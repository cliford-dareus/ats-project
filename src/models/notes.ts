import mongoose from 'mongoose';

interface NoteInterface extends mongoose.Document {
    text: string;
    type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    created_by: string;
    author: string;
    created_at: Date;
    updated_at: Date;
    note_id: string;
    note_type: string;
    organization_id: string;
    mentions: { userId: string; name: string; username?: string }[];
    channel: 'Email' | 'SMS' | 'Internal Note';
};

const NoteSchema = new mongoose.Schema<NoteInterface>({
    text: { type: String, required: true },
    type: { type: String, enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"], default: "NEUTRAL" },
    note_id: { type: String, required: true },
    note_type: { type: String, required: true },
    created_by: { type: String, required: true },
    // Org that owns the note (session org at creation) — used for tenant isolation.
    organization_id: { type: String },
    // Structured @mentions, verified server-side against org membership at write time.
    mentions: [{
        userId: { type: String, required: true },
        name: { type: String, required: true },
        username: { type: String },
    }],
    channel: { type: String, enum: ['Email', 'SMS', 'Internal Note'], required: true },
    author: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);
export default Note;
