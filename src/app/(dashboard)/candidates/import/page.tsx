import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import BulkImportComponent from './_components/bulk-import-component';
import ImportHistory from './_components/import-history';

const BulkImportPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Import Candidates</h1>
          <p className="text-gray-600 mt-2">
            Upload a CSV file to import multiple candidates at once. Make sure your file follows the required format.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BulkImportComponent />
          </div>
          <div className="lg:col-span-1">
            <ImportHistory />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportPage;
