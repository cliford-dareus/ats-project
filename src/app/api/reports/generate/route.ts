import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateReport, getReportHistory } from '@/server/actions/reports-actions';
import { canGenerateReport, canViewReport } from '@/server/permissions';

// Report types the UI can request (see report-generator.tsx). Anything else
// is rejected — reportType is interpolated into the download URL downstream.
const REPORT_TYPES = new Set([
    'executive-summary',
    'detailed-analytics',
    'pipeline-report',
    'source-analysis',
]);

export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await canGenerateReport())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { reportType, dateRange, metrics } = body;

        // Validate request body
        if (!reportType || !dateRange || !dateRange.from || !dateRange.to) {
            return NextResponse.json({
                error: 'Missing required fields: reportType, dateRange'
            }, { status: 400 });
        }

        if (typeof reportType !== 'string' || !REPORT_TYPES.has(reportType)) {
            return NextResponse.json({
                error: 'Invalid reportType'
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
                error: 'From date must be before to date',
                metrics
            }, { status: 400 });
        }

        // Generate the report (validates the type, records a history row)
        const result = await generateReport(reportType, { from: fromDate, to: toDate }, metrics);

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

export async function GET() {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await canViewReport())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Real history: only reports this org actually generated.
        const reports = await getReportHistory();

        return NextResponse.json({
            success: true,
            reports
        });

    } catch (error) {
        console.error('Error fetching report history:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
};
