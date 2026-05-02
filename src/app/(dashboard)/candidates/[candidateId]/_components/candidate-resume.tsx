import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    FileText,
    Download,
    ExternalLink,
    Upload,
    Eye,
    Maximize2,
    Minimize2,
    RotateCw,
    ZoomIn,
    ZoomOut,
    AlertCircle
} from "lucide-react";
import { CandidateWithDetails } from "@/types";
import { format } from "date-fns";

type Props = {
    data: CandidateWithDetails;
};

const CandidateResume = ({ data }: Props) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(100);

    const candidate = data.candidate;
    const resumeUrl = candidate?.cv_path
        ? `https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${candidate.cv_path}`
        : null;

    const handleDownload = () => {
        if (resumeUrl) {
            const link = document.createElement('a');
            link.href = resumeUrl;
            link.download = `${candidate.name}_Resume.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 25, 200));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 25, 50));
    };

    const handleResetZoom = () => {
        setZoomLevel(100);
    };

    if (!resumeUrl) {
        return (
            <div className="py-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Resume Available</h3>
                        <p className="text-gray-500 text-center max-w-sm mb-4">
                            This candidate hasn't uploaded a resume yet.
                        </p>
                        <Button>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Resume
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-6">
            {/* Resume Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Resume & CV
                            </CardTitle>
                            <CardDescription>
                                {candidate.name}'s resume and curriculum vitae
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">PDF</Badge>
                            <Button variant="outline" size="sm" onClick={handleDownload}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.open(resumeUrl, '_blank')}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in New Tab
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Resume Viewer Controls */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Document Viewer</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleZoomOut}
                                disabled={zoomLevel <= 50}
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium min-w-[4rem] text-center">
                                {zoomLevel}%
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleZoomIn}
                                disabled={zoomLevel >= 200}
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResetZoom}
                            >
                                <RotateCw className="h-4 w-4" />
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                            >
                                {isFullscreen ? (
                                    <Minimize2 className="h-4 w-4" />
                                ) : (
                                    <Maximize2 className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div
                        className={`border rounded-lg overflow-hidden ${
                            isFullscreen ? 'fixed inset-4 z-50 bg-white' : 'relative'
                        }`}
                        style={{
                            height: isFullscreen ? 'calc(100vh - 2rem)' : '800px'
                        }}
                    >
                        <div className="w-full h-full overflow-auto">
                            <div
                                style={{
                                    transform: `scale(${zoomLevel / 100})`,
                                    transformOrigin: 'top left',
                                    width: `${10000 / zoomLevel}%`,
                                    height: `${10000 / zoomLevel}%`
                                }}
                            >
                                <object
                                    data={resumeUrl}
                                    type="application/pdf"
                                    width="100%"
                                    height="100%"
                                    className="min-h-full"
                                >
                                    <div className="flex flex-col items-center justify-center h-full p-8">
                                        <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Unable to Display PDF
                                        </h3>
                                        <p className="text-gray-500 text-center mb-4">
                                            Your browser doesn't support PDF viewing. Please download the file to view it.
                                        </p>
                                        <div className="flex gap-2">
                                            <Button onClick={handleDownload}>
                                                <Download className="mr-2 h-4 w-4" />
                                                Download PDF
                                            </Button>
                                            <Button variant="outline" onClick={() => window.open(resumeUrl, '_blank')}>
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Open in New Tab
                                            </Button>
                                        </div>
                                    </div>
                                </object>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Document Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Document Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-medium mb-2">File Details</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">File Name:</span>
                                    <span>{candidate.name}_Resume.pdf</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">File Type:</span>
                                    <span>PDF Document</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Uploaded:</span>
                                    <span>{format(new Date(candidate.created_at), 'MMM dd, yyyy')}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Actions</h4>
                            <div className="space-y-2">
                                <Button variant="outline" size="sm" className="w-full justify-start">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload New Version
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start">
                                    <Eye className="mr-2 h-4 w-4" />
                                    View History
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CandidateResume;
