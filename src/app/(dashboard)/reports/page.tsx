import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ReportsComponent from './_components/reports-component';
import { getReportData } from '@/server/actions/reports-actions';

const ReportsPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  };

  // Fetch report data
  const reportData = await getReportData();

  return (
    <div className="container mx-auto py-6 px-4 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Recruitment Reports</h1>
          <p className="text-gray-600 mt-2">
            Generate comprehensive reports and analytics for your recruitment process.
          </p>
        </div>

        <ReportsComponent reportData={reportData} />
      </div>
    </div>
  );
};

export default ReportsPage;
