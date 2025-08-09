"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Briefcase,
  Target,
  Clock,
  Filter,
  FileText,
  PieChart,
  Activity
} from "lucide-react";
import ReportOverview from './report-overview';
import ReportCharts from './report-charts';
import ReportGenerator from './report-generator';
import ReportHistory from './report-history';


interface ReportData {
  summary: {
    totalApplications: number;
    totalCandidates: number;
    totalJobs: number;
    totalInterviews: number;
    hiredCandidates: number;
  };
  trends: {
    applicationsByDate: Array<{ date: string; count: number }>;
    monthlyTrends: Array<{ month: string; applications: number }>;
  };
  breakdown: {
    applicationsByJob: Array<{ jobTitle: string; jobId: number; count: number }>;
    applicationsByStage: Array<{ stageName: "New Candidate" | "Screening" | "Phone Interview" | "Interview" | "Offer" | 'Applied' | null; stageOrder: number; count: number }>;
  };
  analysis: {
    sourceAnalysis: Array<{ source: string; applications: number; hires: number; conversionRate: number }>;
    timeToHireData: Array<{ range: string; count: number }>;
    diversityMetrics: {
      gender: Array<{ category: string; count: number; percentage: number }>;
      experience: Array<{ category: string; count: number; percentage: number }>;
    };
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

const ReportsComponent = ({ reportData }: Props) => {
  const [activeTab, setActiveTab] = useState('overview');

  const quickStats = [
    {
      title: 'Total Applications',
      value: reportData.summary.totalApplications,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Candidates',
      value: reportData.summary.totalCandidates,
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Open Positions',
      value: reportData.summary.totalJobs,
      icon: Briefcase,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Interviews Scheduled',
      value: reportData.summary.totalInterviews,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Successful Hires',
      value: reportData.summary.hiredCandidates,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Reports Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recruitment Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive insights into your recruitment performance
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ReportOverview reportData={reportData} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <ReportCharts reportData={reportData} />
            </TabsContent>

            <TabsContent value="generate" className="mt-6">
              <ReportGenerator />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <ReportHistory />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsComponent;
