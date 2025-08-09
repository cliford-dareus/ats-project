"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2,
  X
} from "lucide-react";
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { cn } from "@/lib/utils";
import ImportGuidelines from './import-guidelines';

interface CandidateRow {
  name: string;
  email: string;
  phone: string;
  location?: string;
  experience?: string;
  skills?: string;
  education?: string;
  notes?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ValidationError[];
}

const BulkImportComponent = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CandidateRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'result'>('upload');

  const requiredFields = ['name', 'email', 'phone'];
  const optionalFields = ['location', 'experience', 'skills', 'education', 'notes'];

  const validateRow = (row: CandidateRow, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field as keyof CandidateRow] || row[field as keyof CandidateRow]?.trim() === '') {
        errors.push({
          row: index + 1,
          field,
          message: `${field} is required`
        });
      }
    });

    // Validate email format
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push({
        row: index + 1,
        field: 'email',
        message: 'Invalid email format'
      });
    }

    // Validate phone format (basic validation)
    if (row.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(row.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push({
        row: index + 1,
        field: 'phone',
        message: 'Invalid phone format'
      });
    }

    return errors;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0];
    if (csvFile && csvFile.type === 'text/csv') {
      setFile(csvFile);

      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as CandidateRow[];
          setParsedData(data);

          // Validate all rows
          const allErrors: ValidationError[] = [];
          data.forEach((row, index) => {
            const rowErrors = validateRow(row, index);
            allErrors.push(...rowErrors);
          });

          setValidationErrors(allErrors);
          setCurrentStep('preview');
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
        }
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/candidates/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidates: parsedData }),
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult({
          success: true,
          imported: result.imported,
          failed: result.failed,
          errors: result.errors || []
        });
      } else {
        setImportResult({
          success: false,
          imported: 0,
          failed: parsedData.length,
          errors: [{ row: 0, field: 'general', message: result.error || 'Import failed' }]
        });
      }

      setCurrentStep('result');
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        imported: 0,
        failed: parsedData.length,
        errors: [{ row: 0, field: 'general', message: 'Network error occurred' }]
      });
      setCurrentStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [...requiredFields, ...optionalFields];
    const csvContent = headers.join(',') + '\n' +
      'John Doe,john.doe@example.com,+1234567890,New York,5 years,JavaScript React Node.js,Computer Science,Great candidate\n' +
      'Jane Smith,jane.smith@example.com,+0987654321,San Francisco,3 years,Python Django,Engineering,Experienced developer';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportResult(null);
    setCurrentStep('upload');
  };

  return (
    <Tabs defaultValue="import" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="import">Import Candidates</TabsTrigger>
        <TabsTrigger value="guidelines">Guidelines & Help</TabsTrigger>
      </TabsList>

      <TabsContent value="import" className="space-y-6 mt-6">
        {/* Header with Template Download */}
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bulk Import Candidates
              </CardTitle>
              <CardDescription>
                Import multiple candidates from a CSV file
              </CardDescription>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
          currentStep === 'upload' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
        )}>
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
            currentStep === 'upload' ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
          )}>
            1
          </div>
          <span>Upload</span>
        </div>

        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
          currentStep === 'preview' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
        )}>
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
            currentStep === 'preview' ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
          )}>
            2
          </div>
          <span>Preview</span>
        </div>

        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
          currentStep === 'result' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
        )}>
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
            currentStep === 'result' ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
          )}>
            3
          </div>
          <span>Result</span>
        </div>
      </div>

      {/* Upload Step */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file containing candidate information. Make sure it includes the required fields: name, email, and phone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-blue-600">Drop the CSV file here...</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    Drag and drop a CSV file here, or click to select
                  </p>
                  <p className="text-sm text-gray-400">
                    Only CSV files are supported
                  </p>
                </div>
              )}
            </div>

            {file && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Step */}
      {currentStep === 'preview' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview Import Data</CardTitle>
                  <CardDescription>
                    Review the parsed data and fix any validation errors before importing
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={resetImport}>
                    Start Over
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={validationErrors.length > 0 || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import {parsedData.length} Candidates
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Users className="h-3 w-3" />
                  <span>{parsedData.length} candidates</span>
                </Badge>
                {validationErrors.length > 0 ? (
                  <Badge variant="destructive" className="flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{validationErrors.length} errors</span>
                  </Badge>
                ) : (
                  <Badge variant="default" className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>All valid</span>
                  </Badge>
                )}
              </div>

              {validationErrors.length > 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please fix the validation errors below before importing.
                  </AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="preview" className="w-full">
                <TabsList>
                  <TabsTrigger value="preview">Data Preview</TabsTrigger>
                  {validationErrors.length > 0 && (
                    <TabsTrigger value="errors">Validation Errors</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-900">Row</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-900">Name</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-900">Email</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-900">Phone</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-900">Location</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-900">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {parsedData.slice(0, 10).map((row, index) => {
                            const rowErrors = validationErrors.filter(error => error.row === index + 1);
                            const hasErrors = rowErrors.length > 0;

                            return (
                              <tr key={index} className={hasErrors ? "bg-red-50" : ""}>
                                <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                                <td className="px-4 py-2">{row.name}</td>
                                <td className="px-4 py-2">{row.email}</td>
                                <td className="px-4 py-2">{row.phone}</td>
                                <td className="px-4 py-2">{row.location || '-'}</td>
                                <td className="px-4 py-2">
                                  {hasErrors ? (
                                    <Badge variant="destructive" className="text-xs">
                                      Error
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" className="text-xs">
                                      Valid
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.length > 10 && (
                      <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                        Showing first 10 of {parsedData.length} candidates
                      </div>
                    )}
                  </div>
                </TabsContent>

                {validationErrors.length > 0 && (
                  <TabsContent value="errors" className="mt-4">
                    <div className="space-y-2">
                      {validationErrors.map((error, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 rounded border border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm">
                            <strong>Row {error.row}:</strong> {error.message} ({error.field})
                          </span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Result Step */}
      {currentStep === 'result' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span>Import {importResult.success ? 'Completed' : 'Failed'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                  <div className="text-sm text-green-700">Successfully Imported</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                  <div className="text-sm text-red-700">Failed to Import</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Import Errors:</h4>
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 rounded border border-red-200 text-sm">
                      {error.row > 0 ? `Row ${error.row}: ` : ''}{error.message}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex space-x-2">
                <Button onClick={resetImport}>
                  Import More Candidates
                </Button>
                <Button variant="outline" asChild>
                  <a href="/candidates">View All Candidates</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </TabsContent>

      <TabsContent value="guidelines" className="mt-6">
        <ImportGuidelines />
      </TabsContent>
    </Tabs>
  );
};

export default BulkImportComponent;
