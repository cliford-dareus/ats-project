import React from 'react';
// import { auth } from '@clerk/nextjs/server';
// import { redirect } from 'next/navigation';
import ReportsComponent from './_components/reports-component';
import { getReportData } from '@/server/actions/reports-actions';
import ReportHeader from './_components/report-header';

const ReportsPage = async () => {
    // Fetch report data
    const reportData = await getReportData();

    return (
        <div className="container mx-auto py-6 px-4 overflow-auto">
            <div className="max-w-7xl mx-auto">
                <ReportHeader />
                <ReportsComponent reportData={reportData} />
            </div>
        </div>
    );
};

export default ReportsPage;
