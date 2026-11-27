import { ApplicationResponseType } from "@/types";
import { AlertCircle, Calendar, ExternalLink, History, Mail, Phone } from "lucide-react";

type Props = {
    applicationResult: ApplicationResponseType;
};

const ApplicationDetails = ({ applicationResult }: Props) => {
    return (
        <div
            className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4"
        >
            <h3 className="font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                Application Details
            </h3>

            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Applied
                            On</p>
                        <p className="text-sm font-semibold text-foreground">{new Date(applicationResult?.apply_date).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* B22-5: the hardcoded "Internal Rating 4.5" row was removed —
                    no rating column exists, so nothing real can be shown here. */}

                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <History className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Current
                            Stage</p>
                        <span
                            className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full border border-brand-100 uppercase tracking-wider">
                            {applicationResult.current_stage}
                        </span>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-border">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Contact
                    Info</h4>
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {applicationResult.candidate_email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {applicationResult.candidate_phone}
                    </div>
                    {applicationResult.candidate_linkedin && (
                        <a
                            href={applicationResult.candidate_linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:underline"
                        >
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            LinkedIn Profile
                        </a>
                    )}
                    {applicationResult.candidate_portfolio && (
                        <a
                            href={applicationResult.candidate_portfolio}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:underline"
                        >
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            Portfolio
                        </a>
                    )}
                </div>
            </div>

            {(applicationResult.cover_letter ||
                applicationResult.referral_source ||
                applicationResult.expected_salary ||
                applicationResult.earliest_start_date) && (
                    <div className="pt-4 border-t border-border">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Application
                            Info</h4>
                        <div className="space-y-3 text-sm">
                            {applicationResult.cover_letter && (
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Cover Letter</p>
                                    <p className="text-foreground whitespace-pre-wrap">{applicationResult.cover_letter}</p>
                                </div>
                            )}
                            {applicationResult.referral_source && (
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Referral Source</p>
                                    <p className="text-foreground">{applicationResult.referral_source}</p>
                                </div>
                            )}
                            {applicationResult.expected_salary && (
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Expected Salary</p>
                                    <p className="text-foreground">{applicationResult.expected_salary}</p>
                                </div>
                            )}
                            {applicationResult.earliest_start_date && (
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Earliest Start Date</p>
                                    <p className="text-foreground">{applicationResult.earliest_start_date}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
        </div>
    );
};

export default ApplicationDetails;
