"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
    Users,
    type LucideIcon
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import {
    REPORT_TYPES,
    REPORT_METRIC_IDS,
    isReportType,
    type ReportMetricId,
    type ReportTypeId,
} from "@/lib/report-csv";
import { getReportHistory, type ReportHistoryEntry } from "@/server/actions/reports-actions";

const METRIC_LABELS: Record<ReportMetricId, string> = {
    applications: "Total Applications",
    candidates: "Active Candidates",
    hires: "Successful Hires",
    "time-to-hire": "Time to Hire",
    "conversion-rates": "Conversion Rates",
    "source-effectiveness": "Source Effectiveness",
};

const TYPE_ICONS: Record<ReportTypeId, LucideIcon> = {
    "executive-summary": TrendingUp,
    "detailed-analytics": BarChart3,
    "pipeline-report": Users,
    "source-analysis": PieChart,
};

const ReportGenerator = () => {
    const searchParams = useSearchParams();
    const [selectedReportType, setSelectedReportType] = useState<ReportTypeId | ''>('');
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined
    });
    const [selectedMetrics, setSelectedMetrics] = useState<ReportMetricId[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<ReportHistoryEntry[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    // Preselect the report type when linked from the sidebar (?type=...)
    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (isReportType(typeParam)) {
            setSelectedReportType(typeParam);
        }
    }, [searchParams]);

    const loadHistory = async () => {
        try {
            setHistory(await getReportHistory());
            setHistoryError(null);
        } catch (err) {
            console.error('Failed to load report history:', err);
            setHistoryError('Could not load generated reports.');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        void loadHistory();
    }, []);

    const handleMetricToggle = (metricId: ReportMetricId) => {
        setSelectedMetrics(prev =>
            prev.includes(metricId)
                ? prev.filter(id => id !== metricId)
                : [...prev, metricId]
        );
    };

    const generateReport = async () => {
        if (!isReportType(selectedReportType)) {
            setError('Select a report type.');
            return;
        }
        if (!dateRange.from || !dateRange.to) {
            setError('Select both a start and an end date.');
            return;
        }
        if (dateRange.from >= dateRange.to) {
            setError('The start date must be before the end date.');
            return;
        }

        setError(null);
        setIsGenerating(true);

        try {
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

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error ?? 'Failed to generate report');
            }

            // Refresh the real history — the new row is at the top, with a
            // download link to the CSV the server just recorded.
            await loadHistory();

            // Reset form
            setSelectedReportType('');
            setDateRange({ from: undefined, to: undefined });
            setSelectedMetrics([]);

        } catch (err) {
            console.error('Report generation failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

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
                                {REPORT_TYPES.map((type) => {
                                    const TypeIcon = TYPE_ICONS[type.id];
                                    return (
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
                                                <TypeIcon className="h-5 w-5 text-muted-foreground" />
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{type.name}</p>
                                                    <p className="text-xs text-gray-500">{type.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                            <div className="grid grid-cols-1 gap-2">
                                {REPORT_METRIC_IDS.map((metricId) => (
                                    <div key={metricId} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`metric-${metricId}`}
                                            checked={selectedMetrics.includes(metricId)}
                                            onCheckedChange={() => handleMetricToggle(metricId)}
                                        />
                                        <Label htmlFor={`metric-${metricId}`} className="text-sm">
                                            {METRIC_LABELS[metricId]}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Leave all unchecked to include every metric.
                            </p>
                        </div>

                        {error && (
                            <p role="alert" className="text-sm text-red-600">{error}</p>
                        )}

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
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : historyError ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-red-600">{historyError}</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-gray-500">No reports generated yet</p>
                                <p className="text-sm text-muted-foreground">Generate your first report to see it here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((report) => (
                                    <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            <div>
                                                <p className="font-medium text-sm">{report.typeName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {format(new Date(report.dateFrom), 'MMM dd, yyyy')} — {format(new Date(report.dateTo), 'MMM dd, yyyy')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Generated {format(new Date(report.generatedAt), 'PPp')}
                                                    {report.generatedByName ? ` by ${report.generatedByName}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={`/api/reports/download/${report.id}`} download>
                                                <Download className="h-3 w-3" />
                                            </a>
                                        </Button>
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
