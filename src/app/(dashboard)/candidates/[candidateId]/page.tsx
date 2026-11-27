import React from "react";
import { Briefcase, Calendar, ExternalLink, Mail, MapPin, MessageSquare } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { get_candidate_by_id_action } from "@/server/actions/candidates-actions";
import { get_application_by_id_action } from "@/server/actions/application_actions";
import { db_get_org_members_by_ids } from "@/server/queries/drizzle/organization";
import CandidateTabs from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate_tabs";
import type { CandidateScheduleOption } from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-interviews";
import { get_candidate_details } from "@/server/queries/mongo/candidate-details";
import { get_candidate_notes } from "@/server/queries/mongo/note";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Props = {
    params: Promise<{
        candidateId: string;
    }>
};

type ExperienceEntry = {
    position?: string;
    start_date?: string;
    end_date?: string;
    current?: boolean;
};

/**
 * Most recent experience entry: a current role first, otherwise the
 * latest start date. Entries without a parseable start date sort last
 * (in original order) so an unparseable date never invents a headline.
 */
function mostRecentExperience(experience: unknown): ExperienceEntry | undefined {
    if (!Array.isArray(experience)) return undefined;
    const entries = experience.filter(
        (entry): entry is ExperienceEntry => !!entry && typeof entry === "object",
    );
    if (entries.length === 0) return undefined;
    const startTime = (entry: ExperienceEntry) => {
        const time = Date.parse(entry.start_date ?? "");
        return Number.isNaN(time) ? 0 : time;
    };
    return [...entries].sort((a, b) => {
        if (!!a.current !== !!b.current) return a.current ? -1 : 1;
        return startTime(b) - startTime(a);
    })[0];
}

function initialsFor(name: string | null | undefined): string {
    if (!name) return "?";
    const initials = name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    return initials || "?";
}

const Page = async ({ params }: Props) => {
    const { candidateId } = await params;
    const result = await get_candidate_by_id_action(Number(candidateId));
    // NOTE: do not fall back to `{}` here — `Success | {}` collapses the
    // union to `{}`, hiding every property from the type checker.
    if (result && typeof result === "object" && "error" in result) {
        console.error("Error fetching candidate:", result.message);
        return <div>Error loading candidate.</div>;
    }
    const candidate = result;
    if (!candidate.candidate) {
        return <div>Candidate not found.</div>;
    }

    const candidate_details_raw = await get_candidate_details(Number(candidateId));
    const candidate_details = JSON.parse(candidate_details_raw || "{}");
    const candidate_notes = await get_candidate_notes(candidateId);

    // Schedule entry point (Interviews tab): resolve each application
    // through get_application_by_id — the same row shape the review page
    // hands ScheduleInterviewButton — and keep only applications on OPEN
    // jobs. A failure for one application never takes the page down; that
    // application is simply not offered, and with none open there is no
    // button at all (honest empty state, not a dead one).
    const scheduleOptions: CandidateScheduleOption[] = [];
    for (const app of candidate.application ?? []) {
        try {
            const detail = await get_application_by_id_action(app.id);
            if (!detail || "error" in detail) continue;
            const row = detail[0];
            if (!row || row.status !== "OPEN") continue;
            scheduleOptions.push({
                application: row,
                jobName: row.job_apply ?? "Position",
                department: row.department ?? "",
            });
        } catch {
            continue;
        }
    }

    // Interviewer names: interviewer_ids on the interview rows are Clerk
    // user ids — resolve them to names via org membership, server-side.
    // Ids with no org member get no name (never invented); interviews
    // with no resolvable names show no Interviewer line.
    const { orgId } = await auth();
    const interviewerNames: Record<number, string[]> = {};
    const interviewRows = candidate.interview ?? [];
    const interviewerIds = [
        ...new Set(
            interviewRows.flatMap((item) =>
                Array.isArray(item.interviewer_ids) ? item.interviewer_ids : [],
            ),
        ),
    ];
    if (orgId && interviewerIds.length > 0) {
        const members = await db_get_org_members_by_ids(orgId, interviewerIds);
        const nameById = new Map(
            members.map((member) => [member.id, member.name ?? member.email]),
        );
        for (const item of interviewRows) {
            const names = (Array.isArray(item.interviewer_ids)
                ? item.interviewer_ids
                : []
            )
                .map((id) => nameById.get(id))
                .filter((name): name is string => !!name);
            if (names.length > 0) interviewerNames[item.id] = names;
        }
    }

    // The candidate row has no role/rating columns, and the Mongo details
    // doc carries no current_role/title/rating either — so the headline
    // comes from the most recent experience entry, or is omitted entirely
    // (never a hardcoded job title). There is no rating: no rating column
    // or action exists, so no rating UI is rendered.
    // LinkedIn/portfolio live on the candidate row (collected on the apply
    // form), with the details doc kept as a fallback.
    const headline = mostRecentExperience(candidate_details?.experience)?.position?.trim() || null;
    const linkedInUrl = candidate.candidate?.linkedin_url ?? candidate_details?.linkedin_url ?? candidate_details?.linkedIn;
    const portfolioUrl = candidate.candidate?.portfolio_url ?? candidate_details?.portfolio_url;

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between w-full p-4">
                {/* Profile Header */}
                {/* Avatar & Main Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="relative">
                        <Avatar className="w-14 h-14">
                            <AvatarFallback>{initialsFor(candidate.candidate?.name)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" title="Active Applicant" />
                    </div>

                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold text-foreground leading-tight uppercase">{candidate.candidate?.name}</h1>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider",
                                candidate.candidate?.status === 'HIRED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    candidate.candidate?.status === 'REJECTED' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                        "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                                {candidate.candidate?.status}
                            </span>
                        </div>

                        {headline && (
                            <p className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-brand-600" />
                                {headline}
                            </p>
                        )}

                        {/* Location Meta */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground pt-1">
                            {candidate.candidate?.location && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                    {candidate.candidate.location}
                                </span>
                            )}

                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                Applied {format(candidate.candidate?.created_at ?? new Date(), 'MMM d, yyyy')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Contact & Action Cards */}
                <div className="flex flex-wrap lg:flex-col items-stretch gap-2.5 w-full lg:w-auto">
                    {candidate.candidate?.email && (
                        <a
                            href={`mailto:${candidate.candidate.email}`}
                            className="flex-1 lg:flex-none px-5 py-2.5 bg-foreground text-background rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Send Direct Message
                        </a>
                    )}

                    <a
                        href={`mailto:${candidate.candidate?.email}`}
                        className="flex-1 lg:flex-none px-5 py-2.5 bg-muted hover:bg-muted border border-border rounded-2xl text-xs font-bold text-foreground transition-all flex items-center justify-center gap-2"
                    >
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {candidate.candidate?.email}
                    </a>

                    {linkedInUrl && (
                        <a
                            href={linkedInUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 lg:flex-none px-5 py-2.5 bg-muted hover:bg-muted border border-border rounded-2xl text-xs font-bold text-foreground transition-all flex items-center justify-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4 text-brand-600" />
                            LinkedIn Profile
                        </a>
                    )}

                    {portfolioUrl && (
                        <a
                            href={portfolioUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 lg:flex-none px-5 py-2.5 bg-muted hover:bg-muted border border-border rounded-2xl text-xs font-bold text-foreground transition-all flex items-center justify-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4 text-brand-600" />
                            Portfolio
                        </a>
                    )}
                </div>
            </div>

            <CandidateTabs
                data={candidate}
                candidate_details={candidate_details}
                candidate_notes={candidate_notes}
                scheduleOptions={scheduleOptions}
                interviewerNames={interviewerNames}
            />
        </>
    );
};

export default Page;
