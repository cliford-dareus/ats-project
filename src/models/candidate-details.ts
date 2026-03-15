import mongoose from 'mongoose';
import {CandidateExperience} from "@/types";

interface CandidateDetailsInterface extends mongoose.Document {
    resumeSummary: string;
    skills: string[];
    experience: CandidateExperience[];
    education: string[];
};

const CandidateDetailsSchema = new mongoose.Schema<CandidateDetailsInterface>({
    resumeSummary: { type: String},
    skills: { type: []},
    experience: { type: []},
    education: { type: [] },
});

const CandidateDetails = mongoose.models.Experience || mongoose.model('CandidateDetails', CandidateDetailsSchema);
export default CandidateDetails;
