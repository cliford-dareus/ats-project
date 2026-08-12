import React from "react";
import { Briefcase, Calendar, ExternalLink, Mail, MapPin, MessageSquare, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { get_candidate_by_id_action } from "@/server/actions/candidates-actions";
import CandidateTabs from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate_tabs";
import { get_candidate_details } from "@/server/queries/mongo/candidate-details";
import { get_candidate_notes } from "@/server/queries/mongo/note";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Props = {
    params: Promise<{
        candidateId: string;
    }>
};

const Page = async ({ params }: Props) => {
    const { candidateId } = await params;
    const result = await get_candidate_by_id_action(Number(candidateId));
    const candidate = result && typeof result === "object" ? result : {};
    const error =
        result && typeof result === "object" && "error" in result
            ? result.error
            : null;

    if (error) {
        console.error("Error fetching job listings:", error);
        return <div>Error loading jobs.</div>;
    };

    const candidate_details_raw = await get_candidate_details(Number(candidateId));
    const candidate_details = JSON.parse(candidate_details_raw || "{}");
    const candidate_notes = await get_candidate_notes(candidateId);

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between w-full p-4">
                {/* Profile Header */}
                {/* Avatar & Main Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="relative">
                        <Avatar className="w-14 h-14">
                            <AvatarImage src="https://github.com/shadcn.png" />
                            <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" title="Active Applicant" />
                    </div>

                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold text-zinc-900 leading-tight uppercase">{candidate?.candidate?.name}</h1>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider",
                                candidate?.candidate?.status === 'Hired' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    candidate?.candidate?.status === 'Offer' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                        candidate?.candidate?.status === 'Interview' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                            candidate?.candidate?.status === 'Rejected' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                                {candidate.candidate?.status}
                            </span>
                        </div>

                        <p className="text-base font-semibold text-zinc-600 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-brand-600" />
                            {candidate.candidate?.role} {candidate.candidate.department ? `• ${candidate?.candidate?.department}` : 'Software Engineer'}
                        </p>

                        {/* Rating & Location Meta */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-500 pt-1">
                            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                                <span className="font-bold text-amber-700">{candidate.rating || 4.5}</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            className="hover:scale-110 transition-transform"
                                        >
                                            <Star className={cn(
                                                "w-3 h-3",
                                                star <= Math.round(candidate?.rating || 4.5) ? "text-amber-500 fill-amber-500" : "text-zinc-200"
                                            )} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <span className="flex items-center gap-1 text-zinc-600">
                                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                                {candidate?.candidate?.location || 'New York, USA'}
                            </span>

                            <span className="flex items-center gap-1 text-zinc-600">
                                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                Applied {format(candidate?.candidate?.created_at, 'MMM d, yyyy')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Contact & Action Cards */}
                <div className="flex flex-wrap lg:flex-col items-stretch gap-2.5 w-full lg:w-auto">
                    <button
                        className="flex-1 lg:flex-none px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Send Direct Message
                    </button>

                    <a
                        href={`mailto:${candidate.candidate?.email}`}
                        className="flex-1 lg:flex-none px-5 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-2xl text-xs font-bold text-zinc-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Mail className="w-4 h-4 text-zinc-500" />
                        {candidate.candidate?.email}
                    </a>

                    {candidate.linkedIn && (
                        <a
                            href={candidate.linkedIn}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 lg:flex-none px-5 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-2xl text-xs font-bold text-zinc-700 transition-all flex items-center justify-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4 text-brand-600" />
                            LinkedIn Profile
                        </a>
                    )}
                </div>
            </div>

            <CandidateTabs
                data={candidate}
                candidate_details={candidate_details}
                candidate_notes={candidate_notes}
            />
        </>
    );
};

export default Page;
