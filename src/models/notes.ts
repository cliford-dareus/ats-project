import mongoose from 'mongoose';

interface NoteInterface extends mongoose.Document {
    text: string;
    type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    created_by: string;
    author: Date;
    updated_at: Date;
    note_id: string;
    note_type: string;
    channel: 'Email' | 'SMS' | 'Internal Note';
};

const NoteSchema = new mongoose.Schema<NoteInterface>({
    text: { type: String, required: true },
    type: { type: String, enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"], default: "NEUTRAL" },
    note_id: { type: String, required: true },
    note_type: { type: String, required: true },
    created_by: { type: String, required: true },
    channel: { type: String, enum: ['Email', 'SMS', 'Internal Note'], required: true },
    author: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);
export default Note;
