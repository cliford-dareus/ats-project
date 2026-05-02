"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    FileText,
    Download,
    Calendar as CalendarIcon,
    Settings,
    Loader2,
    CheckCircle,
    BarChart3,
    PieChart,
    TrendingUp,
    Users
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PDFGenerator, downloadPDF, ReportData } from "@/lib/pdf-generator";

const ReportGenerator = () => {
    const [selectedReportType, setSelectedReportType] = useState('');
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined
    });
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedReports, setGeneratedReports] = useState<Array<{
        id: string;
        name: string;
        type: string;
        generatedAt: Date;
        status: 'ready' | 'generating' | 'failed';
    }>>([]);

    const reportTypes = [
        {
            id: 'executive-summary',
            name: 'Executive Summary',
            description: 'High-level overview of recruitment performance',
            icon: TrendingUp,
            estimatedTime: '2-3 minutes'
        },
        {
            id: 'detailed-analytics',
            name: 'Detailed Analytics',
            description: 'Comprehensive analysis with charts and insights',
            icon: BarChart3,
            estimatedTime: '5-7 minutes'
        },
        {
            id: 'pipeline-report',
            name: 'Pipeline Report',
            description: 'Current status of all candidates in the pipeline',
            icon: Users,
            estimatedTime: '3-4 minutes'
        },
        {
            id: 'source-analysis',
            name: 'Source Analysis',
            description: 'Performance analysis of recruitment sources',
            icon: PieChart,
            estimatedTime: '2-3 minutes'
        }
    ];

    const availableMetrics = [
        { id: 'applications', label: 'Total Applications', category: 'Volume' },
        { id: 'candidates', label: 'Active Candidates', category: 'Volume' },
        { id: 'hires', label: 'Successful Hires', category: 'Volume' },
        { id: 'time-to-hire', label: 'Time to Hire', category: 'Performance' },
        { id: 'conversion-rates', label: 'Conversion Rates', category: 'Performance' },
        { id: 'source-effectiveness', label: 'Source Effectiveness', category: 'Performance' },
        { id: 'cost-per-hire', label: 'Cost per Hire', category: 'Financial' },
        { id: 'offer-acceptance', label: 'Offer Acceptance Rate', category: 'Performance' },
        { id: 'diversity-metrics', label: 'Diversity Metrics', category: 'Diversity' },
        { id: 'quality-of-hire', label: 'Quality of Hire', category: 'Performance' }
    ];

    const handleMetricToggle = (metricId: string) => {
        setSelectedMetrics(prev =>
            prev.includes(metricId)
                ? prev.filter(id => id !== metricId)
                : [...prev, metricId]
        );
    };

    const generateReport = async () => {
        if (!selectedReportType || !dateRange.from || !dateRange.to) {
            return;
        };

        setIsGenerating(true);

        try {
            // Fetch report data from API
            const response = await fetch('/api/reports/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reportType: selectedReportType,
                    dateRange: {
                        from: dateRange.from.toISOString(),
                        to: dateRange.to.toISOString()
                    },
                    metrics: selectedMetrics
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate report');
            }

            const result = await response.json();

            // Generate PDF based on report type
            const pdfGenerator = new PDFGenerator();
            const reportData: ReportData = {
                title: reportTypes.find(t => t.id === selectedReportType)?.name || 'Custom Report',
                dateRange: { from: dateRange.from, to: dateRange.to },
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
                        { jobTitle: 'Data Scientist', count: 65 },
                        { jobTitle: 'UX Designer', count: 45 },
                        { jobTitle: 'DevOps Engineer', count: 35 }
                    ],
                    applicationsByStage: [
                        { stageName: 'Applied', count: 234 },
                        { stageName: 'Screening', count: 156 },
                        { stageName: 'Interview', count: 89 },
                        { stageName: 'Offer', count: 34 },
                        { stageName: 'Hired', count: 18 }
                    ]
                },
                sourceAnalysis: [
                    { source: 'LinkedIn', applications: 145, hires: 23, conversionRate: 15.9 },
                    { source: 'Indeed', applications: 98, hires: 12, conversionRate: 12.2 },
                    { source: 'Company Website', applications: 76, hires: 18, conversionRate: 23.7 },
                    { source: 'Referrals', applications: 54, hires: 15, conversionRate: 27.8 }
                ]
            };

            let pdfBlob: Blob;
            if (selectedReportType === 'executive-summary') {
                pdfBlob = await pdfGenerator.generateExecutiveSummary(reportData);
            } else {
                pdfBlob = await pdfGenerator.generateDetailedReport(reportData);
            };

            // Download the PDF
            const filename = `${reportData.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            downloadPDF(pdfBlob, filename);

            const newReport = {
                id: result.reportId || `report_${Date.now()}`,
                name: reportData.title,
                type: selectedReportType,
                generatedAt: new Date(),
                status: 'ready' as const
            };

            setGeneratedReports(prev => [newReport, ...prev]);

            // Reset form
            setSelectedReportType('');
            setDateRange({ from: undefined, to: undefined });
            setSelectedMetrics([]);

        } catch (error) {
            console.error('Report generation failed:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadReport = async (reportId: string) => {
        try {
            const report = generatedReports.find(r => r.id === reportId);
            if (!report) {
                alert('Report not found');
                return;
            }

            // Generate PDF for the specific report
            const pdfGenerator = new PDFGenerator();
            const reportData: ReportData = {
                title: report.name,
                dateRange: { from: new Date(), to: new Date() }, // In real app, store this data
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
                        { jobTitle: 'Product Manager', count: 85 }
                    ],
                    applicationsByStage: [
                        { stageName: 'Applied', count: 234 },
                        { stageName: 'Screening', count: 156 }
                    ]
                },
                sourceAnalysis: [
                    { source: 'LinkedIn', applications: 145, hires: 23, conversionRate: 15.9 }
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

    const groupedMetrics = availableMetrics.reduce((acc, metric) => {
        if (!acc[metric.category]) {
            acc[metric.category] = [];
        }
        acc[metric.category].push(metric);
        return acc;
    }, {} as Record<string, typeof availableMetrics>);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Report Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Report Configuration
                        </CardTitle>
                        <CardDescription>
                            Configure your custom recruitment report
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Report Type Selection */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Report Type</Label>
                            <div className="grid grid-cols-1 gap-3">
                                {reportTypes.map((type) => (
                                    <div
                                        key={type.id}
                                        className={cn(
                                            "p-3 border rounded-lg cursor-pointer transition-colors",
                                            selectedReportType === type.id
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                        onClick={() => setSelectedReportType(type.id)}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <type.icon className="h-5 w-5 text-gray-600" />
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{type.name}</p>
                                                <p className="text-xs text-gray-500">{type.description}</p>
                                                <p className="text-xs text-blue-600 mt-1">Est. {type.estimatedTime}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Date Range Selection */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Date Range</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "justify-start text-left font-normal",
                                                !dateRange.from && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange.from ? format(dateRange.from, "PPP") : "From date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateRange.from}
                                            onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "justify-start text-left font-normal",
                                                !dateRange.to && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange.to ? format(dateRange.to, "PPP") : "To date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateRange.to}
                                            onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Metrics Selection */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Include Metrics</Label>
                            <div className="space-y-4">
                                {Object.entries(groupedMetrics).map(([category, metrics]) => (
                                    <div key={category} className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">{category}</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {metrics.map((metric) => (
                                                <div key={metric.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={metric.id}
                                                        checked={selectedMetrics.includes(metric.id)}
                                                        onCheckedChange={() => handleMetricToggle(metric.id)}
                                                    />
                                                    <Label htmlFor={metric.id} className="text-sm">
                                                        {metric.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <Button
                            onClick={generateReport}
                            disabled={!selectedReportType || !dateRange.from || !dateRange.to || isGenerating}
                            className="w-full"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Report...
                                </>
                            ) : (
                                <>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Generate Report
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Generated Reports */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5" />
                            Generated Reports
                        </CardTitle>
                        <CardDescription>
                            Your recently generated reports
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {generatedReports.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-gray-500">No reports generated yet</p>
                                <p className="text-sm text-gray-400">Generate your first report to see it here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {generatedReports.map((report) => (
                                    <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            <div>
                                                <p className="font-medium text-sm">{report.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    Generated {format(report.generatedAt, 'PPp')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant="outline" className="text-xs">
                                                {report.status}
                                            </Badge>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => downloadReport(report.id)}
                                            >
                                                <Download className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ReportGenerator;
