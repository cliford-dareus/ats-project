import mongoose from 'mongoose';

interface ExperienceInterface extends mongoose.Document {
    company: string;
    position: string;
    start_date: Date;
    end_date: Date;
    description: string;
    candidate_id: number;
};

const ExperienceSchema = new mongoose.Schema<ExperienceInterface>({
    company: { type: String, required: true },
    position: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: false },
    description: { type: String, required: true },
    candidate_id: { type: Number, required: true },
});

const Experience = mongoose.models.Experience || mongoose.model('Experience', ExperienceSchema);
export default Experience;
