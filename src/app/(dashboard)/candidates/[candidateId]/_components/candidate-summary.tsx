import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    GraduationCap,
    Star,
    Clock,
    FileText,
    ExternalLink,
    Edit,
    MessageSquare
} from "lucide-react";
import { CandidateWithDetails } from "@/types";
import { format } from "date-fns";

type Props = {
    data: CandidateWithDetails;
};

const CandidateSummary = ({ data }: Props) => {
    const candidate = data.candidate;
    const applications = data.application || [];
    const interviews = data.interview || [];

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-blue-100 text-blue-800';
            case 'hired': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'interviewing': return 'bg-blue-100 text-blue-800';
            case 'screening': return 'bg-yellow-100 text-yellow-800';
            case 'new candidate': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className=" space-y-6 py-6">
            {/* Contact Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Contact Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <div>
                                <p className="text-sm font-medium">Email</p>
                                <p className="text-sm text-gray-600">{candidate?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <div>
                                <p className="text-sm font-medium">Phone</p>
                                <p className="text-sm text-gray-600">{candidate?.phone || 'Not provided'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <div>
                                <p className="text-sm font-medium">Location</p>
                                <p className="text-sm text-gray-600">{candidate?.location || 'Not provided'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <div>
                                <p className="text-sm font-medium">Applied</p>
                                <p className="text-sm text-gray-600">
                                    {format(new Date(candidate?.created_at), 'MMM dd, yyyy')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Current Status:</span>
                            <Badge className={getStatusColor(candidate?.status)}>
                                {candidate?.status}
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Profile
                            </Button>
                            <Button variant="outline" size="sm">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Add Note
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Professional Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Professional Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-medium mb-2">Experience Level</h4>
                            <p className="text-sm text-gray-600">
                                {candidate?.experience_level || 'Not specified'}
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium mb-2">Skills & Expertise</h4>
                            <div className="flex flex-wrap gap-2">
                                {candidate?.skills ? (
                                    candidate?.skills.split(',').map((skill, index) => (
                                        <Badge key={index} variant="secondary">
                                            {skill.trim()}
                                        </Badge>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500">No skills listed</p>
                                )}
                            </div>
                        </div>

                        {candidate?.summary && (
                            <div>
                                <h4 className="font-medium mb-2">Summary</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {candidate?.summary}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Application Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Application Overview
                    </CardTitle>
                    <CardDescription>
                        Summary of applications and interview progress
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {applications.length}
                            </div>
                            <div className="text-sm text-blue-800">Total Applications</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {interviews.length}
                            </div>
                            <div className="text-sm text-green-800">Interviews</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                {applications.filter(app => app?.status === 'Active').length}
                            </div>
                            <div className="text-sm text-purple-800">Active Applications</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Documents & Attachments */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documents & Attachments
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {candidate?.cv_path && (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <p className="font-medium">Resume/CV</p>
                                        <p className="text-sm text-gray-500">PDF Document</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View
                                </Button>
                            </div>
                        )}

                        {/* Placeholder for additional documents */}
                        <div className="flex items-center justify-between p-3 border rounded-lg border-dashed">
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-gray-500">No additional documents</p>
                                    <p className="text-sm text-gray-400">Upload cover letter, portfolio, etc.</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm">
                                Upload
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CandidateSummary;
