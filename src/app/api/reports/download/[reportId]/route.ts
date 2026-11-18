import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { canViewReport } from '@/server/permissions';

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

    // Report ids are generated server-side (<type>_<timestamp>.pdf); reject
    // anything else so the id can't smuggle path traversal or odd input
    // into a future file lookup.
    if (!reportId || !/^[A-Za-z0-9._-]+$/.test(reportId) || reportId.includes('..')) {
      return NextResponse.json({
        error: 'Invalid report ID'
      }, { status: 400 });
    }

    // In a real implementation, you would:
    // 1. Fetch the report data from database
    // 2. Generate the PDF using the PDFGenerator
    // 3. Return the PDF as a response

    // For now, return a success response with download URL
    return NextResponse.json({
      success: true,
      downloadUrl: `/api/reports/download/${reportId}`,
      message: 'Report ready for download'
    });

  } catch (error) {
    console.error('Report download error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to download report'
    }, { status: 500 });
  }
}
