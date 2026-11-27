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

/** Most recent entry: a current role first, otherwise the latest start date. */
function mostRecentExperience(experience: CandidateExperience[]): CandidateExperience | undefined {
    if (experience.length === 0) return undefined;
    const startTime = (entry: CandidateExperience) => {
        const time = Date.parse(entry.start_date ?? "");
        return Number.isNaN(time) ? 0 : time;
    };
    return [...experience].sort((a, b) => {
        if (!!a.current !== !!b.current) return a.current ? -1 : 1;
        return startTime(b) - startTime(a);
    })[0];
}

/**
 * Total experience summed from parseable start/end dates. An entry with
 * an unparseable start date contributes nothing; a current (or open-ended)
 * role runs to today. Returns null when no entry has a usable date range,
 * so the caller omits the line instead of inventing a number.
 */
function totalExperienceLabel(experience: CandidateExperience[]): string | null {
    const now = Date.now();
    let totalMs = 0;
    let usable = false;
    for (const entry of experience) {
        const start = Date.parse(entry.start_date ?? "");
        if (Number.isNaN(start)) continue;
        const endRaw = entry.current ? now : Date.parse(entry.end_date ?? "");
        const end = Number.isNaN(endRaw) ? now : endRaw;
        if (end <= start) continue;
        totalMs += end - start;
        usable = true;
    }
    if (!usable || totalMs <= 0) return null;
    const totalMonths = totalMs / (1000 * 60 * 60 * 24 * 30.44);
    if (totalMonths >= 12) return `${(totalMonths / 12).toFixed(1)} Years`;
    return `${Math.max(1, Math.round(totalMonths))} Months`;
}

const CandidateExperienceAndEducation = ({ experience, education }: Props) => {
    const experienceList = experience ?? [];
    const educationList = education ?? [];
    const mostRecent = mostRecentExperience(experienceList);
    const totalExperience = totalExperienceLabel(experienceList);
    // The candidate row has no role column (candidate.role is never
    // populated) — the closest real value is the most recent job title.
    const primaryDomain = mostRecent?.position?.trim() || null;
    const showCareerSummary = totalExperience !== null || primaryDomain !== null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

                <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
                    <h3 className="font-bold text-foreground flex items-center gap-2 text-brand-dark uppercase tracking-widest">
                        <Building2 className="w-5 h-5 text-brand-600" />
                        Work Experience Timeline
                    </h3>

                    {experienceList.length > 0 ? (
                        <div className="space-y-6">
                            {experienceList.map((exp, idx) => (
                                <div key={idx} className="flex gap-4 p-5 rounded-2xl bg-muted/80 border border-border/60">
                                    <div className="w-12 h-12 bg-card rounded-2xl flex-shrink-0 flex items-center justify-center border border-border text-brand-600 font-bold shadow-sm">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h4 className="font-bold text-sm text-foreground">{exp.position}</h4>
                                            <span className="text-xs font-bold text-muted-foreground bg-card px-2.5 py-1 rounded-lg border border-border">
                                                {exp.start_date} - {exp.end_date}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-brand-700">{exp.company}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed pt-2 font-normal">{exp.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No work experience listed</p>
                    )}
                </div>

                <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
                    <h3 className="font-bold text-foreground flex items-center gap-2 text-brand-dark uppercase tracking-widest">
                        <GraduationCap className="w-5 h-5 text-brand-600" />
                        Education & Credentials
                    </h3>

                    {educationList.length > 0 ? (
                        <div className="space-y-4">
                            {educationList.map((edu, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/80 border border-border/60">
                                    <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center border border-border text-muted-foreground">
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-bold text-foreground">{edu.degree} in {edu.field_of_study} - {edu.school}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No education listed</p>
                    )}
                </div>

            </div>

            {showCareerSummary && (
                <div className="space-y-6">
                    <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-4">
                        <h4 className="font-bold text-base text-foreground">Career Summary</h4>
                        <div className="space-y-3 text-xs font-medium text-muted-foreground">
                            {totalExperience !== null && (
                                <div className="flex justify-between py-2 border-b border-border">
                                    <span>Total Experience</span>
                                    <span className="font-bold text-foreground">{totalExperience}</span>
                                </div>
                            )}
                            {primaryDomain !== null && (
                                <div className="flex justify-between py-2 border-b border-border">
                                    <span>Primary Domain</span>
                                    <span className="font-bold text-foreground">{primaryDomain}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateExperienceAndEducation;
