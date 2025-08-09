import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateReport } from '@/server/actions/reports-actions';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportType, dateRange, metrics } = body;

    // Validate request body
    if (!reportType || !dateRange || !dateRange.from || !dateRange.to) {
      return NextResponse.json({
        error: 'Missing required fields: reportType, dateRange'
      }, { status: 400 });
    }

    // Validate date range
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({
        error: 'Invalid date format'
      }, { status: 400 });
    }

    if (fromDate >= toDate) {
      return NextResponse.json({
        error: 'From date must be before to date'
      }, { status: 400 });
    }

    // Generate the report
    const result = await generateReport(reportType, { from: fromDate, to: toDate });

    return NextResponse.json({
      success: true,
      reportId: result.reportId,
      downloadUrl: result.downloadUrl,
      message: 'Report generated successfully'
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to generate report'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get report history (mock data for now)
    const reportHistory = [
      {
        id: 'report_1',
        name: 'Executive Summary',
        type: 'executive-summary',
        generatedAt: new Date().toISOString(),
        status: 'ready',
        downloadUrl: '/api/reports/download/executive-summary.pdf'
      }
    ];

    return NextResponse.json({
      success: true,
      reports: reportHistory
    });

  } catch (error) {
    console.error('Error fetching report history:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
};
