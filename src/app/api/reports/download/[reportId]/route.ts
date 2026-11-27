import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { canViewReport } from '@/server/permissions';
import { getGeneratedReportCsv } from '@/server/actions/reports-actions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await canViewReport())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reportId } = await params;

    // History ids are numeric row ids. Anything else is rejected — the id
    // is never interpolated into a path or file lookup.
    const id = Number(reportId);
    if (!reportId || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    // Recompute the stored report (org-scoped inside) and stream it as CSV.
    // A row from another org, or a missing row, is a 404.
    const file = await getGeneratedReportCsv(id);
    if (!file) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return new NextResponse(file.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
      },
    });

  } catch (error) {
    console.error('Report download error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to download report'
    }, { status: 500 });
  }
}
