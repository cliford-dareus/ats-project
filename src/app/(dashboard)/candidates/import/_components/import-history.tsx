"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileText,
  Users,
  Calendar
} from "lucide-react";
import { format } from 'date-fns';

interface ImportRecord {
  id: string;
  fileName: string;
  importedAt: Date;
  totalRecords: number;
  successfulImports: number;
  failedImports: number;
  status: 'completed' | 'partial' | 'failed';
  errors?: string[];
}

const ImportHistory = () => {
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching import history
    // In a real app, this would be an API call
    const mockHistory: ImportRecord[] = [
      {
        id: '1',
        fileName: 'candidates_batch_1.csv',
        importedAt: new Date('2024-01-15T10:30:00'),
        totalRecords: 150,
        successfulImports: 145,
        failedImports: 5,
        status: 'partial',
        errors: ['Row 23: Invalid email format', 'Row 67: Duplicate email', 'Row 89: Missing phone number']
      },
      {
        id: '2',
        fileName: 'new_candidates.csv',
        importedAt: new Date('2024-01-14T14:20:00'),
        totalRecords: 75,
        successfulImports: 75,
        failedImports: 0,
        status: 'completed'
      },
      {
        id: '3',
        fileName: 'candidates_export.csv',
        importedAt: new Date('2024-01-13T09:15:00'),
        totalRecords: 200,
        successfulImports: 0,
        failedImports: 200,
        status: 'failed',
        errors: ['Invalid file format', 'Missing required columns']
      }
    ];

    setTimeout(() => {
      setImportHistory(mockHistory);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const downloadErrorReport = (record: ImportRecord) => {
    if (!record.errors || record.errors.length === 0) return;

    const errorReport = [
      'Import Error Report',
      `File: ${record.fileName}`,
      `Date: ${format(record.importedAt, 'PPP')}`,
      `Total Records: ${record.totalRecords}`,
      `Successful: ${record.successfulImports}`,
      `Failed: ${record.failedImports}`,
      '',
      'Errors:',
      ...record.errors.map((error, index) => `${index + 1}. ${error}`)
    ].join('\n');

    const blob = new Blob([errorReport], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${record.id}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Import History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Import History
        </CardTitle>
        <CardDescription>
          View previous candidate import operations and their results
        </CardDescription>
      </CardHeader>
      <CardContent>
        {importHistory.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No import history found</p>
            <p className="text-sm text-gray-400">Your import history will appear here after you import candidates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {importHistory.map((record) => (
              <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(record.status)}
                    <div>
                      <h4 className="font-medium text-gray-900">{record.fileName}</h4>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(record.importedAt, 'PPp')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(record.status)}
                    {record.errors && record.errors.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadErrorReport(record)}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Errors
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">{record.totalRecords}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-gray-600">Success:</span>
                    <span className="font-medium text-green-600">{record.successfulImports}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-gray-600">Failed:</span>
                    <span className="font-medium text-red-600">{record.failedImports}</span>
                  </div>
                </div>

                {record.errors && record.errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Recent Errors:</p>
                    <div className="space-y-1">
                      {record.errors.slice(0, 3).map((error, index) => (
                        <p key={index} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          {error}
                        </p>
                      ))}
                      {record.errors.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{record.errors.length - 3} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Success Rate: {Math.round((record.successfulImports / record.totalRecords) * 100)}%</span>
                    <span>Import ID: {record.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImportHistory;
