import React from 'react';
import ReportsComponent from './_components/reports-component';
import { getReportData } from '@/server/actions/reports-actions';
import ReportHeader from './_components/report-header';
import { isReportRange } from '@/lib/utils';

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const ReportsPage = async ({ searchParams }: Props) => {
    const params = await searchParams;
    const range = isReportRange(params?.range) ? params.range : '30d';

    // Fetch report data for the selected range
    const reportData = await getReportData(range);

    return (
        <div className="container mx-auto py-6 px-4 overflow-auto">
            <div className="max-w-7xl mx-auto">
                <ReportHeader reportData={reportData} range={range} />
                <ReportsComponent reportData={reportData} range={range} />
            </div>
        </div>
    );
};

export default ReportsPage;
