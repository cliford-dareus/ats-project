import {
    GraduationCap,
    Building2
} from "lucide-react";
import { CandidateExperience, CandidateWithDetails, CandidateEducation } from "@/types";

type Props = {
    data: CandidateWithDetails;
    experience: CandidateExperience[];
    education: CandidateEducation[];
};

const CandidateExperienceAndEducation = ({ data, experience, education }: Props) => {
    const candidate = data.candidate;
   
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

                <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                    <h3 className="font-bold text-xl text-zinc-900 tracking-tight flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-brand-600" />
                        Work Experience Timeline
                    </h3>

                    <div className="space-y-6">
                        {experience.map((exp, idx) => (
                            <div key={idx} className="flex gap-4 p-5 rounded-2xl bg-zinc-50/80 border border-zinc-200/60">
                                <div className="w-12 h-12 bg-white rounded-2xl flex-shrink-0 flex items-center justify-center border border-zinc-200 text-brand-600 font-bold shadow-sm">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h4 className="font-bold text-sm text-zinc-900">{exp.position}</h4>
                                        <span className="text-xs font-bold text-zinc-500 bg-white px-2.5 py-1 rounded-lg border border-zinc-200">
                                            {exp.startDate} - {exp.endDate}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-brand-700">{exp.company}</p>
                                    <p className="text-xs text-zinc-600 leading-relaxed pt-2 font-normal">{exp.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                    <h3 className="font-bold text-xl text-zinc-900 tracking-tight flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-brand-600" />
                        Education & Credentials
                    </h3>

                    <div className="space-y-4">
                        {education.map((edu, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/60">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-zinc-200 text-zinc-600">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-zinc-800">{edu.degree} in {edu.fieldOfStudy} - {edu.school}</p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-4">
                    <h4 className="font-bold text-base text-zinc-900">Career Summary</h4>
                    <div className="space-y-3 text-xs font-medium text-zinc-600">
                        <div className="flex justify-between py-2 border-b border-zinc-100">
                            <span>Total Experience</span>
                            <span className="font-bold text-zinc-900">5+ Years</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-zinc-100">
                            <span>Primary Domain</span>
                            <span className="font-bold text-zinc-900">{candidate.role}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-zinc-100">
                            <span>Notice Period</span>
                            <span className="font-bold text-zinc-900">2 Weeks</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateExperienceAndEducation;
