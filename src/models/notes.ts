import mongoose from 'mongoose';

interface NoteInterface extends mongoose.Document {
    application_id?: number;
    candidate_id?: number;
    content: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
};

const NoteSchema = new mongoose.Schema<NoteInterface>({
    candidate_id: { type: Number },
    application_id: { type: Number },
    content: { type: String, required: true },
    created_by: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);
export default Note;
