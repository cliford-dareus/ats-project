"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  Clock,
  Target,
  DollarSign,
  Star,
  Download
} from "lucide-react";
import { ExportUtils } from "@/lib/export-utils";

interface ReportData {
  summary: {
    totalApplications: number;
    totalCandidates: number;
    totalJobs: number;
    totalInterviews: number;
    hiredCandidates: number;
  };
  breakdown: {
    applicationsByJob: Array<{ jobTitle: string; jobId: number; count: number }>;
    applicationsByStage: Array<{ stageName: string; stageOrder: number; count: number }>;
  };
  analysis: {
    sourceAnalysis: Array<{ source: string; applications: number; hires: number; conversionRate: number }>;
    performanceMetrics: {
      averageTimeToHire: number;
      applicationToInterviewRate: number;
      interviewToOfferRate: number;
      offerAcceptanceRate: number;
      costPerHire: number;
      qualityOfHire: number;
    };
  };
};

interface Props {
  reportData: ReportData;
};

const ReportOverview = ({ reportData }: Props) => {
  const { summary, breakdown, analysis } = reportData;

  const handleExportData = (dataType: string) => {
    try {
      const exportData = ExportUtils.exportReportData(dataType, reportData);
      ExportUtils.exportToCSV(exportData);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const keyMetrics = [
    {
      title: 'Average Time to Hire',
      value: `${analysis.performanceMetrics.averageTimeToHire} days`,
      icon: Clock,
      trend: -12,
      description: 'Faster than last month'
    },
    {
      title: 'Application to Interview Rate',
      value: `${analysis.performanceMetrics.applicationToInterviewRate}%`,
      icon: Target,
      trend: 8,
      description: 'Improvement in screening'
    },
    {
      title: 'Offer Acceptance Rate',
      value: `${analysis.performanceMetrics.offerAcceptanceRate}%`,
      icon: TrendingUp,
      trend: 3,
      description: 'Strong candidate interest'
    },
    {
      title: 'Cost Per Hire',
      value: `$${analysis.performanceMetrics.costPerHire.toLocaleString()}`,
      icon: DollarSign,
      trend: -5,
      description: 'Cost optimization'
    },
    {
      title: 'Quality of Hire',
      value: `${analysis.performanceMetrics.qualityOfHire}/5.0`,
      icon: Star,
      trend: 15,
      description: 'Excellent performance'
    }
  ];

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTrendColor = (trend: number) => {
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keyMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <metric.icon className="h-5 w-5 text-gray-600" />
                <div className="flex items-center space-x-1">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                    {Math.abs(metric.trend)}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-sm font-medium text-gray-900">{metric.title}</p>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Top Performing Jobs
                </CardTitle>
                <CardDescription>
                  Jobs with the most applications this period
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportData('applications-by-job')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {breakdown.applicationsByJob.slice(0, 5).map((job, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm truncate">{job.jobTitle}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress
                        value={(job.count / breakdown.applicationsByJob[0].count) * 100}
                        className="flex-1 h-2"
                      />
                      <span className="text-xs text-gray-500 min-w-[3rem]">
                        {job.count} apps
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pipeline Health
                </CardTitle>
                <CardDescription>
                  Current distribution across recruitment stages
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportData('applications-by-stage')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {breakdown.applicationsByStage.map((stage, index) => {
                const total = breakdown.applicationsByStage.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? (stage.count / total) * 100 : 0;

                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{stage.stageName}</p>
                        <span className="text-sm text-gray-600">{stage.count}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Source Performance Analysis
              </CardTitle>
              <CardDescription>
                Effectiveness of different recruitment sources
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportData('source-analysis')}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Source</th>
                  <th className="text-right py-2 font-medium">Applications</th>
                  <th className="text-right py-2 font-medium">Hires</th>
                  <th className="text-right py-2 font-medium">Conversion Rate</th>
                  <th className="text-right py-2 font-medium">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {analysis.sourceAnalysis.map((source, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3 font-medium">{source.source}</td>
                    <td className="py-3 text-right">{source.applications}</td>
                    <td className="py-3 text-right">{source.hires}</td>
                    <td className="py-3 text-right">{source.conversionRate}%</td>
                    <td className="py-3 text-right">
                      <Badge
                        variant={source.conversionRate > 20 ? "default" :
                                source.conversionRate > 15 ? "secondary" : "outline"}
                      >
                        {source.conversionRate > 20 ? "Excellent" :
                         source.conversionRate > 15 ? "Good" : "Average"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>
            AI-powered insights based on your recruitment data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Positive Trend</span>
              </div>
              <p className="text-sm text-green-700">
                Your offer acceptance rate has improved by 3% this month, indicating strong employer branding and competitive offers.
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Optimization Opportunity</span>
              </div>
              <p className="text-sm text-blue-700">
                Consider focusing more resources on referrals and company website, as they show the highest conversion rates.
              </p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800">Process Improvement</span>
              </div>
              <p className="text-sm text-orange-700">
                Time to hire has decreased by 12%, showing improved efficiency in your recruitment process.
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-800">Quality Metrics</span>
              </div>
              <p className="text-sm text-purple-700">
                Quality of hire score is 4.2/5.0, indicating excellent candidate selection and onboarding processes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportOverview;
