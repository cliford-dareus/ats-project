import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Calendar,
    Clock,
    MapPin,
    Video,
    Phone,
    Users,
    CheckCircle,
    AlertCircle,
    XCircle,
    Plus,
    Edit,
    MessageSquare,
    FileText,
    Star,
    User
} from "lucide-react";
import { CandidateWithDetails } from "@/types";
import { format, isAfter, isBefore } from "date-fns";
import Link from "next/link";

type Props = {
    data: CandidateWithDetails;
};

const CandidateInterviews = ({ data }: Props) => {
    const interviews = data.interviews || [];
    const applications = data.applications || [];
    const jobListings = data.job_listings || [];

    const getInterviewTypeIcon = (location: string) => {
        const loc = location?.toLowerCase() || '';
        if (loc.includes('video') || loc.includes('zoom') || loc.includes('teams')) {
            return <Video className="h-4 w-4" />;
        } else if (loc.includes('phone') || loc.includes('call')) {
            return <Phone className="h-4 w-4" />;
        } else {
            return <Users className="h-4 w-4" />;
        }
    };

    const getInterviewTypeLabel = (location: string) => {
        const loc = location?.toLowerCase() || '';
        if (loc.includes('video') || loc.includes('zoom') || loc.includes('teams')) {
            return 'Video Call';
        } else if (loc.includes('phone') || loc.includes('call')) {
            return 'Phone Call';
        } else {
            return 'In Person';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'complete': return 'bg-green-100 text-green-800';
            case 'schedule': return 'bg-blue-100 text-blue-800';
            case 'awaiting_feedback': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'complete': return <CheckCircle className="h-4 w-4" />;
            case 'schedule': return <Calendar className="h-4 w-4" />;
            case 'awaiting_feedback': return <AlertCircle className="h-4 w-4" />;
            case 'cancelled': return <XCircle className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const getJobForApplication = (applicationId: number) => {
        const application = applications.find(app => app.id === applicationId);
        if (!application) return null;
        return jobListings.find(job => job.id === application.job_id);
    };

    const isUpcoming = (startTime: Date | null) => {
        if (!startTime) return false;
        return isAfter(new Date(startTime), new Date());
    };

    const isPast = (startTime: Date | null) => {
        if (!startTime) return false;
        return isBefore(new Date(startTime), new Date());
    };

    const upcomingInterviews = interviews.filter(interview =>
        interview.start_at && isUpcoming(interview.start_at)
    );

    const pastInterviews = interviews.filter(interview =>
        interview.start_at && isPast(interview.start_at)
    );

    if (interviews.length === 0) {
        return (
            <div className="py-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Interviews Scheduled</h3>
                        <p className="text-gray-500 text-center max-w-sm mb-4">
                            This candidate doesn't have any interviews scheduled yet.
                        </p>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Schedule Interview
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-6">
            {/* Interview Overview */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Interview Schedule
                            </CardTitle>
                            <CardDescription>
                                {interviews.length} interview{interviews.length !== 1 ? 's' : ''} scheduled
                            </CardDescription>
                        </div>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Schedule New
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {upcomingInterviews.length}
                            </div>
                            <div className="text-sm text-blue-800">Upcoming</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {interviews.filter(i => i.status === 'COMPLETE').length}
                            </div>
                            <div className="text-sm text-green-800">Completed</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">
                                {interviews.filter(i => i.status === 'AWAITING_FEEDBACK').length}
                            </div>
                            <div className="text-sm text-yellow-800">Awaiting Feedback</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming Interviews */}
            {upcomingInterviews.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
                        <CardDescription>
                            {upcomingInterviews.length} interview{upcomingInterviews.length !== 1 ? 's' : ''} scheduled
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {upcomingInterviews.map((interview) => {
                            const job = getJobForApplication(interview.applications_id);

                            return (
                                <div key={interview.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-lg">
                                                {job?.name || 'Interview'}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {interview.start_at && format(new Date(interview.start_at), 'MMM dd, yyyy')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    {interview.start_at && format(new Date(interview.start_at), 'h:mm a')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    {getInterviewTypeIcon(interview.locations)}
                                                    {getInterviewTypeLabel(interview.locations)}
                                                </span>
                                            </div>
                                        </div>
                                        <Badge className={getStatusColor(interview.status)}>
                                            {getStatusIcon(interview.status)}
                                            <span className="ml-1">{interview.status}</span>
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-3 mb-3">
                                        <MapPin className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-600">{interview.locations}</span>
                                    </div>

                                    <Separator className="my-3" />

                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-500">
                                            Interview ID: {interview.id}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">
                                                <Edit className="mr-2 h-4 w-4" />
                                                Reschedule
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                Add Note
                                            </Button>
                                            <Button size="sm">
                                                Join Interview
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Past Interviews */}
            {pastInterviews.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Interview History</CardTitle>
                        <CardDescription>
                            {pastInterviews.length} completed interview{pastInterviews.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pastInterviews.map((interview) => {
                            const job = getJobForApplication(interview.applications_id);

                            return (
                                <div key={interview.id} className="border rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-lg">
                                                {job?.name || 'Interview'}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {interview.start_at && format(new Date(interview.start_at), 'MMM dd, yyyy')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    {interview.start_at && format(new Date(interview.start_at), 'h:mm a')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    {getInterviewTypeIcon(interview.locations)}
                                                    {getInterviewTypeLabel(interview.locations)}
                                                </span>
                                            </div>
                                        </div>
                                        <Badge className={getStatusColor(interview.status)}>
                                            {getStatusIcon(interview.status)}
                                            <span className="ml-1">{interview.status}</span>
                                        </Badge>
                                    </div>

                                    {/* Interview Feedback Section */}
                                    {interview.status === 'COMPLETE' && (
                                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                            <h5 className="font-medium mb-2">Interview Feedback</h5>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Star className="h-4 w-4 text-yellow-500" />
                                                <span className="text-sm">Overall Rating: 4.5/5</span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Strong technical skills and good cultural fit. Recommended for next round.
                                            </p>
                                        </div>
                                    )}

                                    <Separator className="my-3" />

                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-500">
                                            Interview ID: {interview.id}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">
                                                <FileText className="mr-2 h-4 w-4" />
                                                View Feedback
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                Add Note
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default CandidateInterviews;
