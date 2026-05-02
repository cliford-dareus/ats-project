import { format } from 'date-fns';

export interface ExportData {
  title: string;
  data: any[];
  headers: string[];
  filename?: string;
};

export class ExportUtils {
  static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  static exportToCSV(exportData: ExportData): void {
    const { title, data, headers, filename } = exportData;

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    const csvFilename = filename || `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    this.downloadFile(csvContent, csvFilename, 'text/csv');
  };

  static exportToJSON(exportData: ExportData): void {
    const { title, data, filename } = exportData;

    const jsonContent = JSON.stringify({
      title,
      exportedAt: new Date().toISOString(),
      data
    }, null, 2);

    const jsonFilename = filename || `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.json`;
    this.downloadFile(jsonContent, jsonFilename, 'application/json');
  };

  static exportToExcel(exportData: ExportData): void {
    // For Excel export, we'll create a simple HTML table that Excel can import
    const { title, data, headers, filename } = exportData;

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Exported on: ${format(new Date(), 'PPP')}</p>
          <table border="1">
            <thead>
              <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row =>
                `<tr>
                  ${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}
                </tr>`
              ).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const excelFilename = filename || `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xls`;
    this.downloadFile(htmlContent, excelFilename, 'application/vnd.ms-excel');
  };

  static exportReportData(reportType: string, reportData: any): void {
    let exportData: ExportData;

    switch (reportType) {
      case 'applications-by-job':
        exportData = {
          title: 'Applications by Job Position',
          headers: ['Job Title', 'Applications', 'Percentage'],
          data: reportData.breakdown.applicationsByJob.map((job: any) => {
            const total = reportData.breakdown.applicationsByJob.reduce((sum: number, j: any) => sum + j.count, 0);
            const percentage = total > 0 ? ((job.count / total) * 100).toFixed(1) : '0';
            return {
              'Job Title': job.jobTitle,
              'Applications': job.count,
              'Percentage': `${percentage}%`
            };
          })
        };
        break;

      case 'applications-by-stage':
        exportData = {
          title: 'Applications by Stage',
          headers: ['Stage', 'Count', 'Percentage'],
          data: reportData.breakdown.applicationsByStage.map((stage: any) => {
            const total = reportData.breakdown.applicationsByStage.reduce((sum: number, s: any) => sum + s.count, 0);
            const percentage = total > 0 ? ((stage.count / total) * 100).toFixed(1) : '0';
            return {
              'Stage': stage.stageName,
              'Count': stage.count,
              'Percentage': `${percentage}%`
            };
          })
        };
        break;

      case 'source-analysis':
        exportData = {
          title: 'Source Performance Analysis',
          headers: ['Source', 'Applications', 'Hires', 'Conversion Rate'],
          data: reportData.analysis.sourceAnalysis.map((source: any) => ({
            'Source': source.source,
            'Applications': source.applications,
            'Hires': source.hires,
            'Conversion Rate': `${source.conversionRate}%`
          }))
        };
        break;

      case 'performance-metrics':
        exportData = {
          title: 'Performance Metrics',
          headers: ['Metric', 'Value', 'Description'],
          data: [
            {
              'Metric': 'Average Time to Hire',
              'Value': `${reportData.analysis.performanceMetrics.averageTimeToHire} days`,
              'Description': 'Time from application to hire'
            },
            {
              'Metric': 'Application to Interview Rate',
              'Value': `${reportData.analysis.performanceMetrics.applicationToInterviewRate}%`,
              'Description': 'Screening effectiveness'
            },
            {
              'Metric': 'Interview to Offer Rate',
              'Value': `${reportData.analysis.performanceMetrics.interviewToOfferRate}%`,
              'Description': 'Interview success rate'
            },
            {
              'Metric': 'Offer Acceptance Rate',
              'Value': `${reportData.analysis.performanceMetrics.offerAcceptanceRate}%`,
              'Description': 'Candidate acceptance rate'
            },
            {
              'Metric': 'Cost per Hire',
              'Value': `$${reportData.analysis.performanceMetrics.costPerHire.toLocaleString()}`,
              'Description': 'Average recruitment cost'
            },
            {
              'Metric': 'Quality of Hire',
              'Value': `${reportData.analysis.performanceMetrics.qualityOfHire}/5.0`,
              'Description': 'Performance rating'
            }
          ]
        };
        break;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    };

    return exportData;
  };

  static async exportChart(chartElementId: string, format: 'png' | 'pdf', filename?: string): Promise<void> {
    const chartElement = document.getElementById(chartElementId);
    if (!chartElement) {
      throw new Error('Chart element not found');
    };

    if (format === 'png') {
      const { exportChartAsImage } = await import('./pdf-generator');
      const pngFilename = filename || `chart_${new Date().toISOString().split('T')[0]}.png`;
      await exportChartAsImage(chartElementId, pngFilename);
    } else if (format === 'pdf') {
      const { PDFGenerator, downloadPDF } = await import('./pdf-generator');
      const pdfGenerator = new PDFGenerator();
      const pdfBlob = await pdfGenerator.captureChartAsPDF(chartElementId, 'Chart Export');
      const pdfFilename = filename || `chart_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPDF(pdfBlob, pdfFilename);
    };
  };

  static exportMultipleFormats(exportData: ExportData): void {
    // Export in multiple formats simultaneously
    this.exportToCSV(exportData);
    this.exportToJSON(exportData);
    this.exportToExcel(exportData);
  };
};

// Convenience functions
export const exportToCSV = (data: ExportData) => ExportUtils.exportToCSV(data);
export const exportToJSON = (data: ExportData) => ExportUtils.exportToJSON(data);
export const exportToExcel = (data: ExportData) => ExportUtils.exportToExcel(data);
export const exportChart = (chartElementId: string, format: 'png' | 'pdf', filename?: string) =>
  ExportUtils.exportChart(chartElementId, format, filename);
export const exportReportData = (reportType: string, reportData: any) =>
  ExportUtils.exportReportData(reportType, reportData);
