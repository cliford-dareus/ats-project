"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  Download,
  Users
} from "lucide-react";

const ImportGuidelines = () => {
  const requiredFields = [
    { name: 'name', description: 'Full name of the candidate', example: 'John Doe' },
    { name: 'email', description: 'Valid email address', example: 'john.doe@example.com' },
    { name: 'phone', description: 'Phone number with country code', example: '+1234567890' }
  ];

  const optionalFields = [
    { name: 'location', description: 'City, State or Country', example: 'New York, NY' },
    { name: 'experience', description: 'Years of experience or description', example: '5 years' },
    { name: 'skills', description: 'Comma-separated skills', example: 'JavaScript, React, Node.js' },
    { name: 'education', description: 'Educational background', example: 'Computer Science, MIT' },
    { name: 'notes', description: 'Additional notes about the candidate', example: 'Great communication skills' }
  ];

  const validationRules = [
    'Email addresses must be unique across all candidates',
    'Phone numbers should include country code (e.g., +1, +44)',
    'Names cannot be empty or contain only spaces',
    'Maximum file size: 10MB',
    'Maximum 1000 candidates per import',
    'CSV file must have headers in the first row'
  ];

  const commonErrors = [
    { error: 'Invalid email format', solution: 'Ensure emails follow the format: user@domain.com' },
    { error: 'Duplicate email', solution: 'Remove duplicate entries or use unique email addresses' },
    { error: 'Missing required field', solution: 'Fill in all required fields: name, email, phone' },
    { error: 'Invalid phone format', solution: 'Use international format: +1234567890' },
    { error: 'File too large', solution: 'Split large files into smaller batches (max 1000 records)' }
  ];

  return (
    <div className="space-y-6">
      {/* File Format Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            File Format Requirements
          </CardTitle>
          <CardDescription>
            Follow these guidelines to ensure successful import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your CSV file must include headers in the first row. Use the template download for the correct format.
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Required Fields
            </h4>
            <div className="space-y-2">
              {requiredFields.map((field, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <div>
                    <Badge variant="default" className="mr-2">{field.name}</Badge>
                    <span className="text-sm text-gray-700">{field.description}</span>
                  </div>
                  <code className="text-xs bg-white px-2 py-1 rounded border">
                    {field.example}
                  </code>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              Optional Fields
            </h4>
            <div className="space-y-2">
              {optionalFields.map((field, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                  <div>
                    <Badge variant="outline" className="mr-2">{field.name}</Badge>
                    <span className="text-sm text-gray-700">{field.description}</span>
                  </div>
                  <code className="text-xs bg-white px-2 py-1 rounded border">
                    {field.example}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Validation Rules
          </CardTitle>
          <CardDescription>
            Your data must meet these requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {validationRules.map((rule, index) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{rule}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Common Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Common Errors & Solutions
          </CardTitle>
          <CardDescription>
            How to fix the most common import issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commonErrors.map((item, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{item.error}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Test with a small batch first (10-20 candidates) to verify your format</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Clean your data before import - remove duplicates and validate emails</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Use UTF-8 encoding to support international characters</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Keep backups of your original files before processing</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Import during off-peak hours for better performance</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportGuidelines;
