import { ApplicationResponseType } from "@/types";
import { AlertCircle, Calendar, ExternalLink, History, Mail, Phone, Star } from "lucide-react";

type Props = {
    applicationResult: ApplicationResponseType;
};

const ApplicationDetails = ({ applicationResult }: Props) => {
    return (
        <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 space-y-4"
        >
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-zinc-400" />
                Application Details
            </h3>

            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Applied
                            On</p>
                        <p className="text-sm font-semibold text-zinc-900">{new Date(applicationResult?.apply_date).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                        <Star className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Internal
                            Rating</p>
                        <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-zinc-900">4.5</p>
                            <Star className="w-3 h-3 text-amber-500 fill-current" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                        <History className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Current
                            Stage</p>
                        <span
                            className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full border border-brand-100 uppercase tracking-wider">
                            {applicationResult.current_stage}
                        </span>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-zinc-100">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-3">Contact
                    Info</h4>
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Mail className="w-4 h-4 text-zinc-400" />
                        {applicationResult.candidate_email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Phone className="w-4 h-4 text-zinc-400" />
                        {applicationResult.candidate_phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <ExternalLink className="w-4 h-4 text-zinc-400" />
                        LinkedIn Profile
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationDetails;
