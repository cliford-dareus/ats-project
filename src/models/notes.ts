import mongoose from 'mongoose';

interface NoteInterface extends mongoose.Document {
    content: string;
    type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    created_by: string;
    created_at: Date;
    updated_at: Date;
    note_parent_id: string;
    note_parent_type: string;
};

const NoteSchema = new mongoose.Schema<NoteInterface>({
    content: { type: String, required: true },
    type: { type: String, enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"], default: "NEUTRAL" },
    created_by: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    note_parent_id: { type: String, required: true },
    note_parent_type: { type: String, required: true },
});

const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);
export default Note;
