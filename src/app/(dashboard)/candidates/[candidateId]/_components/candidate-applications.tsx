import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
    Briefcase,
    Calendar,
    Clock,
    MapPin,
    DollarSign,
    ArrowRight,
    Eye,
    MessageSquare,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    User
} from "lucide-react";
import { CandidateWithDetails } from "@/types";
import { format } from "date-fns";
import Link from "next/link";

type Props = {
    data: CandidateWithDetails;
};

const CandidateApplications = ({ data }: Props) => {
    const applications = data.application || [];
    const jobListings = data.job_listing || [];
    const stages = data.stage || [];

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'hired': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'active': return 'bg-blue-100 text-blue-800';
            case 'withdrawn': return 'bg-gray-100 text-gray-800';
            case 'on hold': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'hired': return <CheckCircle className="h-4 w-4" />;
            case 'rejected': return <XCircle className="h-4 w-4" />;
            case 'active': return <AlertCircle className="h-4 w-4" />;
            case 'withdrawn': return <XCircle className="h-4 w-4" />;
            case 'on hold': return <Clock className="h-4 w-4" />;
            default: return <AlertCircle className="h-4 w-4" />;
        }
    };

    const getJobDetails = (jobId: number) => {
        return jobListings.find(job => job.id === jobId);
    };

    const getCurrentStage = (applicationId: number) => {
        return stages.find(stage => stage.applications_id === applicationId);
    };

    const getStageProgress = (stageName: string) => {
        const stageOrder = {
            'applied': 20,
            'screening': 40,
            'phone interview': 60,
            'interview': 80,
            'offer': 90,
            'hired': 100
        };
        return stageOrder[stageName?.toLowerCase()] || 0;
    };

    if (applications.length === 0) {
        return (
            <div className="py-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Briefcase className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications</h3>
                        <p className="text-gray-500 text-center max-w-sm">
                            This candidate hasn't applied to any positions yet.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-6">
            {/* Applications Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Applications Overview
                    </CardTitle>
                    <CardDescription>
                        {applications.length} application{applications.length !== 1 ? 's' : ''} across different positions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {applications.length}
                            </div>
                            <div className="text-sm text-blue-800">Total Applications</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {applications.filter(app => app.status === 'Active').length}
                            </div>
                            <div className="text-sm text-green-800">Active</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">
                                {applications.filter(app => app.status === 'On Hold').length}
                            </div>
                            <div className="text-sm text-yellow-800">On Hold</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                                {applications.filter(app => app.status === 'Rejected').length}
                            </div>
                            <div className="text-sm text-red-800">Rejected</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Individual Applications */}
            <div className="space-y-4">
                {applications.map((application) => {
                    const job = getJobDetails(application.job_id);
                    const currentStage = getCurrentStage(application.id);
                    const progress = getStageProgress(currentStage?.stage_name || 'applied');

                    return (
                        <Card key={application.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">
                                            {job?.name || 'Position Not Found'}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-4 mt-2">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                Applied {format(new Date(application.created_at), 'MMM dd, yyyy')}
                                            </span>
                                            {job?.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4" />
                                                    {job.location}
                                                </span>
                                            )}
                                            {job?.salary_range && (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="h-4 w-4" />
                                                    {job.salary_range}
                                                </span>
                                            )}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={getStatusColor(application.status)}>
                                            {getStatusIcon(application.status)}
                                            <span className="ml-1">{application.status}</span>
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Current Stage Progress */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">
                                            Current Stage: {currentStage?.stage_name || 'Applied'}
                                        </span>
                                        <span className="text-sm text-gray-500">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>

                                {/* Job Description Preview */}
                                {job?.description && (
                                    <div>
                                        <h4 className="font-medium mb-2">Job Description</h4>
                                        <p className="text-sm text-gray-600 line-clamp-3">
                                            {job.description}
                                        </p>
                                    </div>
                                )}

                                <Separator />

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Clock className="h-4 w-4" />
                                        Last updated {format(new Date(application.updated_at), 'MMM dd, yyyy')}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm">
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Add Note
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/applications/${application.id}`}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Details
                                            </Link>
                                        </Button>
                                        <Button size="sm" asChild>
                                            <Link href={`/jobs/${job?.id}`}>
                                                <ArrowRight className="mr-2 h-4 w-4" />
                                                View Job
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default CandidateApplications;
