import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Mail,
    Phone,
    Calendar,
    Clock,
    FileText,
    User,
    Briefcase,
    Star,
    MessageSquare,
    Download,
    ExternalLink,
    MapPin,
    ArrowLeft,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { CustomTabsTrigger, Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { get_application_by_id_action } from "@/server/actions/application_actions";
import { get_candidate_by_id_action } from "@/server/actions/candidates-actions";
import { get_job_listings_stages_action } from "@/server/actions/job-listings-actions";
import { get_org_members_action } from "@/server/actions/organization_actions";
import { get_candidate_notes } from "@/server/queries/mongo/note";
import { derive_interview_status } from "@/lib/interview-status";
import type { MentionUser } from "@/components/mentions-text-area";
import type { NoteType } from "@/types";
import ReviewHeaderActions from "./_components/review-header-actions";
import ScheduleInterviewButton from "./_components/schedule-interview-button";
import InterviewFeedbackButton from "./_components/interview-feedback-button";
import ReviewNotesTab from "./_components/review-notes-tab";
import Link from "next/link";

type Props = {
    params: {
        applicationId: string
        candidateId: string
    }
};

const INTERVIEW_STATUS_LABELS: Record<string, string> = {
    SCHEDULE: "Scheduled",
    AWAITING_FEEDBACK: "Awaiting Feedback",
    COMPLETE: "Completed",
    HOLD_PENDING: "Hold Pending",
};

/** The interview fields the review page renders (see get_candidate_by_id_db). */
type ReviewInterview = {
    id: number;
    start_at: Date | string | null;
    end_at: Date | string | null;
    type: string | null;
    locations: string;
    link: string | null;
    status: string | null;
    hold_status: string | null;
};

/** Hold-aware status label, mirroring application-interview-card. A past
 * SCHEDULE interview derives to AWAITING_FEEDBACK (see interview-status). */
function interview_status_label(interview: ReviewInterview): string {
    switch (interview.hold_status) {
        case "TENTATIVE": return "Awaiting candidate";
        case "CONFIRMED": return "Confirmed";
        case "DECLINED": return "Declined";
        case "EXPIRED": return "Hold expired";
        case "RELEASED": return "Hold released";
        default: {
            const derived = derive_interview_status(interview);
            return INTERVIEW_STATUS_LABELS[derived] ?? derived;
        }
    }
}

function format_interview_datetime(value: Date | string | null | undefined): string {
    if (!value) return "Not scheduled";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not scheduled";
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

/** Duration in minutes, derived from the stored start/end times. */
function interview_duration_minutes(interview: ReviewInterview): number | null {
    if (!interview.start_at || !interview.end_at) return null;
    const minutes = Math.round(
        (new Date(interview.end_at).getTime() - new Date(interview.start_at).getTime()) / 60000
    );
    return minutes > 0 ? minutes : null;
}

const Page = async ({ params }: Props) => {
    const { applicationId, candidateId } = await params;

    const applicationResult = await get_application_by_id_action(Number(applicationId));
    const candidateResult = await get_candidate_by_id_action(Number(candidateId));

    // Handle error cases — a candidate from another org now reads as
    // "not found" (the query is org-scoped), same as a missing candidate.
    if (!candidateResult || 'error' in candidateResult || !candidateResult.candidate || !applicationResult || 'error' in applicationResult) {
        return (
            <div className="p-4">
                <div className="text-center py-8">
                    <h2 className="text-xl font-semibold text-foreground">Application not found</h2>
                    <p className="text-muted-foreground mt-2">The application or candidate you're looking for doesn't exist.</p>
                    <Link href="/applications">
                        <Button className="mt-4">
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Applications
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const candidate = candidateResult.candidate;
    const applications = candidateResult.application || [];
    const interviews = candidateResult.interview || [];
    const attachments = candidateResult.attachment || [];
    const scoreCards = candidateResult.scoreCards ?? [];

    const reviewedApplication = applicationResult[0];
    const jobId = reviewedApplication.job_id;
    const jobName = reviewedApplication.job_apply ?? "Position";
    const department = reviewedApplication.department ?? "";
    const currentStageName: string | null = reviewedApplication.current_stage ?? null;

    // Job stages for the progress card and the Advance menu. A failure
    // here must not take the whole page down — fall back to no stages.
    let stages: { id: number; stage_name: string | null; stage_order_id: number | null; color: string | null }[] = [];
    try {
        // job_id can be null when the job join misses — then there are
        // simply no stages to list.
        const stagesResult =
            jobId !== null ? await get_job_listings_stages_action(jobId) : [];
        if (Array.isArray(stagesResult)) {
            stages = stagesResult.map(
                (stage: { id: number; stage_name: string | null; stage_order_id: number | null; color: string | null }) => ({
                    id: stage.id,
                    stage_name: stage.stage_name ?? null,
                    stage_order_id: stage.stage_order_id ?? null,
                    color: stage.color ?? null,
                }),
            );
        }
    } catch {
        stages = [];
    }
    const sortedStages = [...stages].sort(
        (a, b) => (a.stage_order_id ?? Number.MAX_SAFE_INTEGER) - (b.stage_order_id ?? Number.MAX_SAFE_INTEGER),
    );
    const currentStageIndex = Math.max(
        0,
        sortedStages.findIndex((stage) => stage.stage_name === currentStageName),
    );
    const progressPercent =
        sortedStages.length > 1
            ? Math.round((currentStageIndex / (sortedStages.length - 1)) * 100)
            : 100;

    // Org members for the @mention picker in the note composer.
    let users: MentionUser[] = [];
    try {
        users = await get_org_members_action();
    } catch {
        users = [];
    }

    // Real candidate notes for the Notes tab (JSON string from the query).
    let candidateNotes: NoteType[] = [];
    try {
        const notesJson = await get_candidate_notes(String(candidateId));
        if (notesJson) candidateNotes = JSON.parse(notesJson);
        if (!Array.isArray(candidateNotes)) candidateNotes = [];
    } catch {
        candidateNotes = [];
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/applications">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Applications
                        </Button>
                    </Link>
                </div>
                <h1 className="font-bold text-3xl text-foreground">
                    Application Review
                </h1>
                <p className="text-muted-foreground mt-1">
                    Reviewing {candidate?.name}'s application for this position
                </p>
            </div>

            {/* Candidate Header Card */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-6">
                            <Avatar className="w-20 h-20">
                                <AvatarImage src="https://github.com/shadcn.png" />
                                <AvatarFallback className="text-xl font-semibold">
                                    {candidate?.name?.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-3">
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground">{candidate?.name}</h2>
                                    <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
                                        {candidate?.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail size={16} />
                                                <span>{candidate.email}</span>
                                            </div>
                                        )}
                                        {candidate?.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone size={16} />
                                                <span>{candidate.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} />
                                            <span>Applied {new Date(candidate?.created_at || '').toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge
                                        variant={candidate?.status === 'ACTIVE' ? 'default' : candidate?.status === 'HIRED' ? 'secondary' : 'destructive'}
                                        className="w-fit"
                                    >
                                        {candidate?.status === 'ACTIVE' && <CheckCircle size={14} className="mr-1" />}
                                        {candidate?.status === 'REJECTED' && <XCircle size={14} className="mr-1" />}
                                        {candidate?.status === 'HIRED' && <Star size={14} className="mr-1" />}
                                        {candidate?.status || 'ACTIVE'}
                                    </Badge>
                                    <Badge variant="outline">
                                        <Briefcase size={14} className="mr-1" />
                                        {applications.length} Application{applications.length !== 1 ? 's' : ''}
                                    </Badge>
                                    <Badge variant="outline">
                                        <FileText size={14} className="mr-1" />
                                        {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <ReviewHeaderActions
                            applicationId={Number(applicationId)}
                            candidateId={Number(candidateId)}
                            jobId={jobId}
                            jobName={jobName}
                            department={department}
                            stages={stages}
                            currentStageName={currentStageName}
                            application={reviewedApplication}
                            users={users}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Application Progress */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock size={20} />
                        Application Progress
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Current Stage</span>
                            <Badge variant="secondary">{currentStageName ?? "No stage"}</Badge>
                        </div>
                        <Progress value={progressPercent} className="w-full" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            {sortedStages.length > 0 ? (
                                sortedStages.map((stage) => (
                                    <span key={stage.id}>{stage.stage_name ?? `Stage ${stage.id}`}</span>
                                ))
                            ) : (
                                <span>{currentStageName ?? "No stages for this job"}</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs Section */}
            <Tabs defaultValue="overview" className="w-full">
                <div className="border-b">
                    <TabsList className="bg-transparent rounded-none p-0 h-auto">
                        <CustomTabsTrigger
                            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                            value="overview"
                        >
                            <User size={16} className="mr-2" />
                            Overview
                        </CustomTabsTrigger>
                        <CustomTabsTrigger
                            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                            value="resume"
                        >
                            <FileText size={16} className="mr-2" />
                            Resume & Documents
                        </CustomTabsTrigger>
                        <CustomTabsTrigger
                            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                            value="applications"
                        >
                            <Briefcase size={16} className="mr-2" />
                            Applications ({applications.length})
                        </CustomTabsTrigger>
                        <CustomTabsTrigger
                            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                            value="interviews"
                        >
                            <Calendar size={16} className="mr-2" />
                            Interviews ({interviews.length})
                        </CustomTabsTrigger>
                        <CustomTabsTrigger
                            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                            value="notes"
                        >
                            <MessageSquare size={16} className="mr-2" />
                            Notes & Feedback
                        </CustomTabsTrigger>
                    </TabsList>
                </div>

                <div className="mt-6">
                    {/* Overview Tab */}
                    <TabsContent value="overview" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Candidate Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User size={20} />
                                        Candidate Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Full Name</label>
                                            <p className="mt-1 text-foreground">{candidate?.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Email</label>
                                            <p className="mt-1 text-foreground">{candidate?.email || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Phone</label>
                                            <p className="mt-1 text-foreground">{candidate?.phone || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Status</label>
                                            <p className="mt-1">
                                                <Badge variant={candidate?.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                    {candidate?.status || 'ACTIVE'}
                                                </Badge>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Applied Date</label>
                                            <p className="mt-1 text-foreground">
                                                {new Date(candidate?.created_at || '').toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Last Updated</label>
                                            <p className="mt-1 text-foreground">
                                                {new Date(candidate?.updated_at || '').toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Stats */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Star size={20} />
                                        Quick Stats
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
                                            <div className="text-sm text-blue-600">Applications</div>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600">{interviews.length}</div>
                                            <div className="text-sm text-green-600">Interviews</div>
                                        </div>
                                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                                            <div className="text-2xl font-bold text-purple-600">{attachments.length}</div>
                                            <div className="text-sm text-purple-600">Documents</div>
                                        </div>
                                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                                            <div className="text-2xl font-bold text-orange-600">{scoreCards.length}</div>
                                            <div className="text-sm text-orange-600">Evaluations</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Resume Tab */}
                    <TabsContent value="resume" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Resume Viewer */}
                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileText size={20} />
                                                Resume
                                            </div>
                                            {candidate?.cv_path && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a
                                                        href={`/api/candidates/${candidateId}/resume`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Download size={16} className="mr-2" />
                                                        Download
                                                    </a>
                                                </Button>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {candidate?.cv_path ? (
                                            <object
                                                data={`/api/candidates/${candidateId}/resume?view=1`}
                                                type="application/pdf"
                                                width="100%"
                                                height="800px"
                                                className="border rounded"
                                            >
                                                <div className="text-center py-12">
                                                    <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                                                    <p className="text-muted-foreground mb-4">Unable to display PDF in browser</p>
                                                    <Button variant="outline" asChild>
                                                        <a
                                                            href={`/api/candidates/${candidateId}/resume`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink size={16} className="mr-2" />
                                                            Open in New Tab
                                                        </a>
                                                    </Button>
                                                </div>
                                            </object>
                                        ) : (
                                            <div className="text-center py-12">
                                                <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-medium text-foreground mb-2">No resume uploaded</h3>
                                                <p className="text-muted-foreground">This candidate hasn't uploaded a resume yet.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Documents List */}
                            <div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText size={20} />
                                            All Documents
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {candidate?.cv_path && (
                                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <FileText size={16} className="text-red-500" />
                                                        <div>
                                                            <div className="text-sm font-medium">Resume.pdf</div>
                                                            <div className="text-xs text-muted-foreground">PDF Document</div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a
                                                            href={`/api/candidates/${candidateId}/resume`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Download size={14} />
                                                        </a>
                                                    </Button>
                                                </div>
                                            )}
                                            {attachments.map((_attachment: any, index: number) => (
                                                <div key={_attachment.id ?? index} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <FileText size={16} className="text-blue-500" />
                                                        <div>
                                                            <div className="text-sm font-medium">{_attachment.file_name ?? `Document ${index + 1}`}</div>
                                                            <div className="text-xs text-muted-foreground">Attachment</div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a
                                                            href={`/api/attachments/${_attachment.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Download size={14} />
                                                        </a>
                                                    </Button>
                                                </div>
                                            ))}
                                            {attachments.length === 0 && !candidate?.cv_path && (
                                                <div className="text-center py-6 text-muted-foreground">
                                                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">No documents available</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Applications Tab */}
                    <TabsContent value="applications" className="mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Briefcase size={20} />
                                    Application History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {applications.length > 0 ? (
                                        applications.map((app: any, index: number) => {
                                            const isReviewed = app.id === Number(applicationId);
                                            return (
                                            <div key={index} className="border rounded-lg p-6 hover:bg-muted transition-colors">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-lg text-foreground">{isReviewed ? jobName : `Application #${app.id}`}</h3>
                                                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar size={14} />
                                                                <span>Applied: {new Date(app.created_at || candidate?.created_at || '').toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={14} />
                                                                <span>Updated: {new Date(app.updated_at || candidate?.updated_at || '').toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary">
                                                        {isReviewed ? (currentStageName ?? "No stage") : (candidate?.status || 'ACTIVE')}
                                                    </Badge>
                                                </div>
                                                <Separator className="my-4" />
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <label className="font-medium text-foreground">Application ID</label>
                                                        <p className="text-foreground">#{app.id || applicationId}</p>
                                                    </div>
                                                    <div>
                                                        <label className="font-medium text-foreground">Status</label>
                                                        <p className="text-foreground">{candidate?.status || 'ACTIVE'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-12">
                                            <Briefcase size={48} className="mx-auto text-muted-foreground mb-4" />
                                            <h3 className="text-lg font-medium text-foreground mb-2">No applications found</h3>
                                            <p className="text-muted-foreground">This candidate hasn't submitted any applications yet.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Interviews Tab */}
                    <TabsContent value="interviews" className="mt-0">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar size={20} />
                                        Interview History
                                    </CardTitle>
                                    <ScheduleInterviewButton
                                        application={reviewedApplication}
                                        jobName={jobName}
                                        department={department}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {interviews.length > 0 ? (
                                        interviews.map((interview: ReviewInterview, index: number) => {
                                            const duration = interview_duration_minutes(interview);
                                            const hold_released = ["DECLINED", "EXPIRED", "RELEASED"].includes(
                                                interview.hold_status ?? "NONE"
                                            );
                                            return (
                                                <div key={index} className="border rounded-lg p-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-semibold text-lg">Interview #{index + 1}</h3>
                                                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar size={14} />
                                                                    <span>Scheduled: {format_interview_datetime(interview.start_at)}</span>
                                                                </div>
                                                                {duration !== null && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Clock size={14} />
                                                                        <span>Duration: {duration} minutes</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                                {interview.type && (
                                                                    <span>Type: {interview.type}</span>
                                                                )}
                                                                {interview.locations && (
                                                                    <div className="flex items-center gap-1">
                                                                        <MapPin size={14} />
                                                                        <span>{interview.locations}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <InterviewFeedbackButton
                                                                interview={interview}
                                                                candidateName={candidate?.name ?? ""}
                                                                jobName={jobName}
                                                                existing={scoreCards.find(
                                                                    (card) => card.interviews_id === interview.id,
                                                                )}
                                                            />
                                                            <Badge variant={derive_interview_status(interview) === 'COMPLETE' ? 'default' : 'secondary'}>
                                                                {interview_status_label(interview)}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    {interview.link && !hold_released && (
                                                        <a
                                                            href={interview.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                                        >
                                                            Join meeting <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-12">
                                            <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
                                            <h3 className="text-lg font-medium text-foreground mb-2">No interviews scheduled</h3>
                                            <p className="text-muted-foreground mb-4">Schedule an interview to continue the evaluation process.</p>
                                            <ScheduleInterviewButton
                                                application={reviewedApplication}
                                                jobName={jobName}
                                                department={department}
                                                label="Schedule First Interview"
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Notes Tab */}
                    <TabsContent value="notes" className="mt-0">
                        <ReviewNotesTab
                            candidateId={Number(candidateId)}
                            users={users}
                            notes={candidateNotes}
                            scoreCards={scoreCards}
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default Page;
