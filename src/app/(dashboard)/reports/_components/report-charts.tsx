"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Download,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Activity
} from "lucide-react";
import { PDFGenerator, exportChartAsImage, downloadPDF } from "@/lib/pdf-generator";

interface ReportData {
  trends: {
    applicationsByDate: Array<{ date: string; count: number }>;
    monthlyTrends: Array<{ month: string; applications: number }>;
  };
  breakdown: {
    applicationsByJob: Array<{ jobTitle: string; jobId: number; count: number }>;
    applicationsByStage: Array<{ stageName: string; stageOrder: number; count: number }>;
  };
  analysis: {
    sourceAnalysis: Array<{ source: string; applications: number; hires: number; conversionRate: number }>;
    timeToHireData: Array<{ range: string; count: number }>;
    diversityMetrics: {
      gender: Array<{ category: string; count: number; percentage: number }>;
      experience: Array<{ category: string; count: number; percentage: number }>;
    };
  };
};

interface Props {
  reportData: ReportData;
};

const ReportCharts = ({ reportData }: Props) => {
  const [activeChart, setActiveChart] = useState('trends');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const downloadChart = async (chartType: string) => {
    console.log(activeChart, chartType);
    try {
      const chartElementId = `chart-${chartType}-${activeChart}`;
      const chartTitle = `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`;

      // Try to export as image first
      try {
        await exportChartAsImage(chartElementId, `${chartTitle}_${new Date().toISOString().split('T')[0]}.png`);
      } catch (imageError) {
        console.warn('Image export failed, trying PDF export:', imageError);

        // Fallback to PDF export
        const pdfGenerator = new PDFGenerator();
        const pdfBlob = await pdfGenerator.captureChartAsPDF(chartElementId, chartTitle);
        downloadPDF(pdfBlob, `${chartTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (error) {
      console.error('Chart export failed:', error);
      alert('Failed to export chart. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeChart} onValueChange={setActiveChart}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-fit grid-cols-4">
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Breakdown
            </TabsTrigger>
            <TabsTrigger value="sources" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Sources
            </TabsTrigger>
            <TabsTrigger value="diversity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Diversity
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => downloadChart(activeChart)}>
            <Download className="mr-2 h-4 w-4" />
            Export Chart
          </Button>
        </div>

        <TabsContent value="trends" className="space-y-6">
          {/* Applications Trend */}
          <Card >
            <CardHeader>
              <CardTitle>Applications Trend (Last 30 Days)</CardTitle>
              <CardDescription>Daily application volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]" id={`chart-trends-${activeChart}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportData.trends.applicationsByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Application Trends</CardTitle>
              <CardDescription>Application volume by month over the last year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]" id={`chart-monthly-trends-${activeChart}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData.trends.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="applications"
                      stroke="#8884d8"
                      strokeWidth={3}
                      dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          {/* Applications by Job */}
          <Card>
            <CardHeader>
              <CardTitle>Applications by Job Position</CardTitle>
              <CardDescription>Top 10 positions by application volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]" id={`chart-applications-by-job-${activeChart}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.breakdown.applicationsByJob.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="jobTitle"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Applications by Stage */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Distribution</CardTitle>
              <CardDescription>Current applications across recruitment stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.breakdown.applicationsByStage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stageName" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          {/* Source Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Sources</CardTitle>
                <CardDescription>Distribution of applications by source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.analysis.sourceAnalysis}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ source, percentage }) => `${source} (${percentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="applications"
                      >
                        {reportData.analysis.sourceAnalysis.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Source Conversion Rates</CardTitle>
                <CardDescription>Effectiveness of each recruitment source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.analysis.sourceAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="source" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="conversionRate" fill="#FF8042" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time to Hire Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Time to Hire Distribution</CardTitle>
              <CardDescription>How long it takes to complete the hiring process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.analysis.timeToHireData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diversity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Candidate diversity by gender</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.analysis.diversityMetrics.gender}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) => `${category} (${percentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {reportData.analysis.diversityMetrics.gender.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* CandidateDetails Level Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Experience Level Distribution</CardTitle>
                <CardDescription>Candidate distribution by experience level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.analysis.diversityMetrics.experience}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percentage }) => `${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {reportData.analysis.diversityMetrics.experience.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportCharts;
