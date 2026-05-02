"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    History,
    Download,
    FileText,
    Calendar,
    Clock,
    Trash2,
    Eye,
    Share
} from "lucide-react";
import { format } from 'date-fns';
import { PDFGenerator, downloadPDF, ReportData } from "@/lib/pdf-generator";

interface ReportHistoryItem {
    id: string;
    name: string;
    type: string;
    generatedAt: Date;
    generatedBy: string;
    fileSize: string;
    downloadCount: number;
    status: 'ready' | 'expired' | 'processing';
};

const ReportHistory = () => {
    const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate fetching report history
        const mockHistory: ReportHistoryItem[] = [
            {
                id: '1',
                name: 'Q4 2024 Executive Summary',
                type: 'executive-summary',
                generatedAt: new Date('2024-01-15T10:30:00'),
                generatedBy: 'John Doe',
                fileSize: '2.4 MB',
                downloadCount: 12,
                status: 'ready'
            },
            {
                id: '2',
                name: 'December Pipeline Analysis',
                type: 'pipeline-report',
                generatedAt: new Date('2024-01-14T14:20:00'),
                generatedBy: 'Jane Smith',
                fileSize: '1.8 MB',
                downloadCount: 8,
                status: 'ready'
            },
            {
                id: '3',
                name: 'Source Performance Report',
                type: 'source-analysis',
                generatedAt: new Date('2024-01-13T09:15:00'),
                generatedBy: 'Mike Johnson',
                fileSize: '3.1 MB',
                downloadCount: 15,
                status: 'ready'
            },
            {
                id: '4',
                name: 'Annual Diversity Report',
                type: 'detailed-analytics',
                generatedAt: new Date('2024-01-10T16:45:00'),
                generatedBy: 'Sarah Wilson',
                fileSize: '4.2 MB',
                downloadCount: 25,
                status: 'expired'
            },
            {
                id: '5',
                name: 'Weekly Recruitment Summary',
                type: 'executive-summary',
                generatedAt: new Date('2024-01-08T11:30:00'),
                generatedBy: 'Tom Brown',
                fileSize: '1.2 MB',
                downloadCount: 6,
                status: 'ready'
            }
        ];

        setTimeout(() => {
            setReportHistory(mockHistory);
            setIsLoading(false);
        }, 1000);
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ready':
                return <Badge variant="default" className="bg-green-100 text-green-800">Ready</Badge>;
            case 'expired':
                return <Badge variant="secondary" className="bg-red-100 text-red-800">Expired</Badge>;
            case 'processing':
                return <Badge variant="outline">Processing</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    const getReportTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            'executive-summary': 'Executive Summary',
            'detailed-analytics': 'Detailed Analytics',
            'pipeline-report': 'Pipeline Report',
            'source-analysis': 'Source Analysis'
        };
        return types[type] || type;
    };

    const downloadReport = async (reportId: string) => {
        try {
            const report = reportHistory.find(r => r.id === reportId);
            if (!report) {
                alert('Report not found');
                return;
            }

            // Generate PDF for the specific report
            const pdfGenerator = new PDFGenerator();
            const reportData: ReportData = {
                title: report.name,
                dateRange: { from: report.generatedAt, to: new Date() },
                summary: {
                    totalApplications: 450,
                    totalCandidates: 320,
                    totalJobs: 25,
                    totalInterviews: 180,
                    hiredCandidates: 45
                },
                metrics: {
                    averageTimeToHire: 18.5,
                    applicationToInterviewRate: 24.3,
                    interviewToOfferRate: 32.1,
                    offerAcceptanceRate: 87.2,
                    costPerHire: 3250,
                    qualityOfHire: 4.2
                },
                breakdown: {
                    applicationsByJob: [
                        { jobTitle: 'Software Engineer', count: 120 },
                        { jobTitle: 'Product Manager', count: 85 },
                        { jobTitle: 'Data Scientist', count: 65 }
                    ],
                    applicationsByStage: [
                        { stageName: 'Applied', count: 234 },
                        { stageName: 'Screening', count: 156 },
                        { stageName: 'Interview', count: 89 }
                    ]
                },
                sourceAnalysis: [
                    { source: 'LinkedIn', applications: 145, hires: 23, conversionRate: 15.9 },
                    { source: 'Indeed', applications: 98, hires: 12, conversionRate: 12.2 }
                ]
            };

            let pdfBlob: Blob;
            if (report.type === 'executive-summary') {
                pdfBlob = await pdfGenerator.generateExecutiveSummary(reportData);
            } else {
                pdfBlob = await pdfGenerator.generateDetailedReport(reportData);
            }

            const filename = `${report.name.replace(/\s+/g, '_')}_${format(report.generatedAt, 'yyyy-MM-dd')}.pdf`;
            downloadPDF(pdfBlob, filename);

        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download report. Please try again.');
        }
    };

    const deleteReport = (reportId: string) => {
        setReportHistory(prev => prev.filter(report => report.id !== reportId));
    };

    const shareReport = (reportId: string) => {
        console.log(`Sharing report: ${reportId}`);
        // In a real implementation, this would open a share dialog
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Report History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Report History
                            </CardTitle>
                            <CardDescription>
                                View and manage your previously generated reports
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-sm">
                            {reportHistory.length} reports
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {reportHistory.length === 0 ? (
                        <div className="text-center py-8">
                            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-gray-500">No reports found</p>
                            <p className="text-sm text-gray-400">Generated reports will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reportHistory.map((report) => (
                                <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <FileText className="h-5 w-5 text-gray-600" />
                                            <div>
                                                <h4 className="font-medium text-gray-900">{report.name}</h4>
                                                <p className="text-sm text-gray-500">
                                                    {getReportTypeLabel(report.type)} • Generated by {report.generatedBy}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {getStatusBadge(report.status)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-600">
                                                {format(report.generatedAt, 'MMM dd, yyyy')}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-600">
                                                {format(report.generatedAt, 'HH:mm')}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-600">{report.fileSize}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Download className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-600">{report.downloadCount} downloads</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t">
                                        <div className="text-xs text-gray-500">
                                            Report ID: {report.id}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => shareReport(report.id)}
                                                disabled={report.status !== 'ready'}
                                            >
                                                <Share className="mr-1 h-3 w-3" />
                                                Share
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => downloadReport(report.id)}
                                                disabled={report.status !== 'ready'}
                                            >
                                                <Download className="mr-1 h-3 w-3" />
                                                Download
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => deleteReport(report.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Storage Usage */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Storage Usage</CardTitle>
                    <CardDescription>
                        Monitor your report storage consumption
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Used Storage</span>
                            <span className="text-sm font-medium">12.7 MB of 100 MB</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '12.7%' }}></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                                <div className="font-medium text-gray-900">{reportHistory.length}</div>
                                <div className="text-gray-500">Total Reports</div>
                            </div>
                            <div className="text-center">
                                <div className="font-medium text-gray-900">
                                    {reportHistory.filter(r => r.status === 'ready').length}
                                </div>
                                <div className="text-gray-500">Available</div>
                            </div>
                            <div className="text-center">
                                <div className="font-medium text-gray-900">
                                    {reportHistory.reduce((sum, r) => sum + r.downloadCount, 0)}
                                </div>
                                <div className="text-gray-500">Total Downloads</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportHistory;
