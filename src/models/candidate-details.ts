import mongoose from 'mongoose';
import { CandidateEducation, CandidateExperience, CandidateReference } from "@/types";

interface CandidateDetailsInterface extends mongoose.Document {
    candidate_id: number;
    resumeSummary: string;
    skills: string[];
    experience: CandidateExperience[];
    education: CandidateEducation[];
    references: CandidateReference[];
};

const CandidateDetailsSchema = new mongoose.Schema<CandidateDetailsInterface>({
    candidate_id: { type: Number, required: true },
    resumeSummary: { type: String },
    skills: { type: [] },
    experience: { type: [] },
    education: { type: [] },
    references: { type: [] },
});

const CandidateDetails = mongoose.models.CandidateDetails || mongoose.model('CandidateDetails', CandidateDetailsSchema);
export default CandidateDetails;
