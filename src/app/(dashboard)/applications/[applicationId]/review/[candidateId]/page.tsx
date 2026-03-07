import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
    ChevronDown,
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
    ArrowLeft,
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye,
    Plus
} from "lucide-react";
import {CustomTabsTrigger, Tabs, TabsContent, TabsList} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {Progress} from "@/components/ui/progress";
import {Textarea} from "@/components/ui/textarea";
import { get_application_by_id_action } from "@/server/actions/application_actions";
import { get_candidate_by_id_action } from "@/server/actions/candidates-actions";
import Link from "next/link";

type Props = {
    params: {
        applicationId: string
        candidateId: string
    }
};

const Page = async ({params}: Props) => {
    const {applicationId, candidateId} = await params;

    const applicationResult = await get_application_by_id_action({applicationId: Number(applicationId)});
    const candidateResult = await get_candidate_by_id_action(Number(candidateId));

    // Handle error cases
    if (!candidateResult || 'error' in candidateResult || !applicationResult || 'error' in applicationResult) {
        return (
            <div className="p-4">
                <div className="text-center py-8">
                    <h2 className="text-xl font-semibold text-gray-900">Application not found</h2>
                    <p className="text-gray-500 mt-2">The application or candidate you're looking for doesn't exist.</p>
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
    const scoreCards = candidateResult.scoreCard || [];

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
                <h1 className="font-bold text-3xl text-gray-900">
                    Application Review
                </h1>
                <p className="text-gray-600 mt-1">
                    Reviewing {candidate?.name}'s application for this position
                </p>
            </div>

            {/* Candidate Header Card */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-6">
                            <Avatar className="w-20 h-20">
                                <AvatarImage src="https://github.com/shadcn.png"/>
                                <AvatarFallback className="text-xl font-semibold">
                                    {candidate?.name?.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-3">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{candidate?.name}</h2>
                                    <div className="flex items-center gap-6 text-sm text-gray-600 mt-2">
                                        {candidate?.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail size={16}/>
                                                <span>{candidate.email}</span>
                                            </div>
                                        )}
                                        {candidate?.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone size={16}/>
                                                <span>{candidate.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16}/>
                                            <span>Applied {new Date(candidate?.created_at || '').toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge
                                        variant={candidate?.status === 'Active' ? 'default' : candidate?.status === 'Hired' ? 'secondary' : 'destructive'}
                                        className="w-fit"
                                    >
                                        {candidate?.status === 'Active' && <CheckCircle size={14} className="mr-1" />}
                                        {candidate?.status === 'Rejected' && <XCircle size={14} className="mr-1" />}
                                        {candidate?.status === 'Hired' && <Star size={14} className="mr-1" />}
                                        {candidate?.status || 'Active'}
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

                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm">
                                <MessageSquare size={16} className="mr-2" />
                                Add Note
                            </Button>
                            <Button variant="outline" size="sm">
                                <Calendar size={16} className="mr-2" />
                                Schedule Interview
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="gap-2">
                                        <CheckCircle size={16} />
                                        <span>Advance</span>
                                        <ChevronDown size={16}/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Advance Candidate</DropdownMenuLabel>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem>
                                        <Eye size={16} className="mr-2" />
                                        Move to Screening
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Phone size={16} className="mr-2" />
                                        Move to Phone Interview
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <User size={16} className="mr-2" />
                                        Move to Interview
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <FileText size={16} className="mr-2" />
                                        Move to Offer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Star size={16} className="mr-2" />
                                        Mark as Hired
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="destructive" className="gap-2">
                                        <XCircle size={16} />
                                        <span>Reject</span>
                                        <ChevronDown size={16}/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Rejection Reasons</DropdownMenuLabel>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem>
                                        <AlertCircle size={16} className="mr-2" />
                                        Not qualified
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <CheckCircle size={16} className="mr-2" />
                                        Position filled
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Clock size={16} className="mr-2" />
                                        No response
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <XCircle size={16} className="mr-2" />
                                        Other
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
                            <Badge variant="secondary">Screening</Badge>
                        </div>
                        <Progress value={40} className="w-full" />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Applied</span>
                            <span>Screening</span>
                            <span>Interview</span>
                            <span>Offer</span>
                            <span>Hired</span>
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
                                            <label className="text-sm font-medium text-gray-700">Full Name</label>
                                            <p className="mt-1 text-gray-900">{candidate?.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Email</label>
                                            <p className="mt-1 text-gray-900">{candidate?.email || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Phone</label>
                                            <p className="mt-1 text-gray-900">{candidate?.phone || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Status</label>
                                            <p className="mt-1">
                                                <Badge variant={candidate?.status === 'Active' ? 'default' : 'secondary'}>
                                                    {candidate?.status || 'Active'}
                                                </Badge>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Applied Date</label>
                                            <p className="mt-1 text-gray-900">
                                                {new Date(candidate?.created_at || '').toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Last Updated</label>
                                            <p className="mt-1 text-gray-900">
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
                                                        href={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${candidate.cv_path}`}
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
                                                data={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${candidate.cv_path}`}
                                                type="application/pdf"
                                                width="100%"
                                                height="800px"
                                                className="border rounded"
                                            >
                                                <div className="text-center py-12">
                                                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                                                    <p className="text-gray-600 mb-4">Unable to display PDF in browser</p>
                                                    <Button variant="outline" asChild>
                                                        <a
                                                            href={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${candidate.cv_path}`}
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
                                                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">No resume uploaded</h3>
                                                <p className="text-gray-600">This candidate hasn't uploaded a resume yet.</p>
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
                                                            <div className="text-xs text-gray-500">PDF Document</div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a
                                                            href={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${candidate.cv_path}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Download size={14} />
                                                        </a>
                                                    </Button>
                                                </div>
                                            )}
                                            {attachments.map((_attachment: any, index: number) => (
                                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <FileText size={16} className="text-blue-500" />
                                                        <div>
                                                            <div className="text-sm font-medium">Document {index + 1}</div>
                                                            <div className="text-xs text-gray-500">Attachment</div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm">
                                                        <Download size={14} />
                                                    </Button>
                                                </div>
                                            ))}
                                            {attachments.length === 0 && !candidate?.cv_path && (
                                                <div className="text-center py-6 text-gray-500">
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
                                        applications.map((app: any, index: number) => (
                                            <div key={index} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-lg text-gray-900">Position #{index + 1}</h3>
                                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
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
                                                        Active Application
                                                    </Badge>
                                                </div>
                                                <Separator className="my-4" />
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <label className="font-medium text-gray-700">Application ID</label>
                                                        <p className="text-gray-900">#{app.id || applicationId}</p>
                                                    </div>
                                                    <div>
                                                        <label className="font-medium text-gray-700">Status</label>
                                                        <p className="text-gray-900">{candidate?.status || 'Active'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <Briefcase size={48} className="mx-auto text-gray-400 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
                                            <p className="text-gray-600">This candidate hasn't submitted any applications yet.</p>
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
                                    <Button>
                                        <Plus size={16} className="mr-2" />
                                        Schedule Interview
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {interviews.length > 0 ? (
                                        interviews.map((interview: any, index: number) => (
                                            <div key={index} className="border rounded-lg p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-semibold text-lg">Interview #{index + 1}</h3>
                                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar size={14} />
                                                                <span>Scheduled: {new Date(interview.scheduled_at || '').toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={14} />
                                                                <span>Duration: {interview.duration || '60'} minutes</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'}>
                                                        {interview.status || 'Scheduled'}
                                                    </Badge>
                                                </div>
                                                {interview.feedback && (
                                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                                        <h4 className="font-medium mb-2">Feedback</h4>
                                                        <p className="text-sm text-gray-700">{interview.feedback}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews scheduled</h3>
                                            <p className="text-gray-600 mb-4">Schedule an interview to continue the evaluation process.</p>
                                            <Button>
                                                <Plus size={16} className="mr-2" />
                                                Schedule First Interview
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Notes Tab */}
                    <TabsContent value="notes" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Add Note */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Plus size={20} />
                                        Add New Note
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Textarea
                                        placeholder="Add your notes about this candidate..."
                                        className="min-h-[120px]"
                                    />
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" id="private" className="rounded" />
                                            <label htmlFor="private" className="text-sm text-gray-600">Private note</label>
                                        </div>
                                        <Button>
                                            <MessageSquare size={16} className="mr-2" />
                                            Add Note
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notes History */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare size={20} />
                                        Notes & Feedback
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {scoreCards.length > 0 ? (
                                            scoreCards.map((scoreCard: any, index: number) => (
                                                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-medium text-sm">Evaluation #{index + 1}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(scoreCard.created_at || '').toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-700">
                                                        Score: {scoreCard.score || 'Not scored'}
                                                    </p>
                                                    {scoreCard.feedback && (
                                                        <p className="text-sm text-gray-600 mt-1">{scoreCard.feedback}</p>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8">
                                                <MessageSquare size={32} className="mx-auto text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-600">No notes or feedback yet</p>
                                                <p className="text-xs text-gray-500 mt-1">Add the first note to start tracking feedback</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default Page;
