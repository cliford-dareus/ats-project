import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TABLE_HEADER } from './constant';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);

export interface ReportData {
    title: string;
    dateRange: { from: Date; to: Date };
    summary: {
        totalApplications: number;
        totalCandidates: number;
        totalJobs: number;
        totalInterviews: number;
        hiredCandidates: number;
    };
    metrics: {
        averageTimeToHire: number;
        applicationToInterviewRate: number;
        interviewToOfferRate: number;
        offerAcceptanceRate: number;
        costPerHire: number;
        qualityOfHire: number;
    };
    breakdown: {
        applicationsByJob: Array<{ jobTitle: string; count: number }>;
        applicationsByStage: Array<{ stageName: string; count: number }>;
    };
    sourceAnalysis: Array<{ source: string; applications: number; hires: number; conversionRate: number }>;
};

export class PDFGenerator {
    private pdf: jsPDF;
    // private autoTable: any;
    private pageHeight: number;
    private pageWidth: number;
    private currentY: number;
    private margin: number;
    private padding: number;

    constructor() {
        this.pdf = new jsPDF();
        this.pageHeight = this.pdf.internal.pageSize.height;
        this.pageWidth = this.pdf.internal.pageSize.width;
        this.currentY = 20;
        this.margin = 20;
        this.padding = 1;
    };

    // ── Elements ──────────────────────────────────────────────────────────
    private addHeader(title: string, dateRange?: { from: Date; to: Date }) {
        // Company logo placeholder
        this.pdf.setFontSize(20);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Recruitment Report', this.margin, this.currentY);

        this.currentY += 10;
        this.pdf.setFontSize(16);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(title, this.margin, this.currentY);

        if (dateRange) {
            this.currentY += 8;
            this.pdf.setFontSize(10);
            this.pdf.text(
                `Report Period: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`,
                this.margin,
                this.currentY
            )
        }

        this.currentY += 8;
        this.pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, this.margin, this.currentY);

        // Add line separator
        this.currentY += 10;
        this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
        this.currentY += 15;
    };

    private addSection(title: string) {
        this.checkPageBreak(20);
        this.pdf.setFontSize(14);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(title, this.margin, this.currentY);
        this.currentY += 12;
    };

    private addText(text: string, fontSize: number = 10, isBold: boolean = false) {
        this.checkPageBreak(8);
        this.pdf.setFontSize(fontSize);
        this.pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        this.pdf.text(text, this.margin, this.currentY);
        this.currentY += fontSize * 0.6;
    };

    private addTable(table: string, rows: string[][]) {
        this.checkPageBreak(30);
        const cellHeight = 8;
        const lineHeight = 4;
        const headers = TABLE_HEADER[table];
        const tableWidth = this.pageWidth - 2 * this.margin;
        const cellWidth = tableWidth / headers.length;
        const columnWidths = Array(headers.length).fill(cellWidth);

        // ── Headers ──────────────────────────────────────────────
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'bold');
        const headerY = this.currentY;

        headers.forEach((header, index) => {
            const x = this.margin + index * cellWidth;
            const maxWidth = columnWidths[index] - this.padding * 2;

            this.pdf.rect(x, headerY, columnWidths[index], cellHeight);

            const lines = this.pdf.splitTextToSize(header, maxWidth);
            lines.forEach((line: string, idx: number) => {  // fix: use idx
                this.pdf.text(
                    line,
                    x + this.padding,
                    headerY + this.padding + idx * lineHeight,
                    { baseline: 'middle' }
                );
            });
        });

        this.currentY += cellHeight;

        // ── Rows ─────────────────────────────────────────────────
        this.pdf.setFontSize(7);
        this.pdf.setFont('helvetica', 'normal');

        rows.forEach((row) => {
            let maxLines = 1;
            const rowData = row.map((cell, colIndex) => {
                const maxWidth = columnWidths[colIndex] - this.padding * 2;
                const text = cell?.toString() ?? '';
                const lines = this.pdf.splitTextToSize(text, maxWidth);
                maxLines = Math.max(maxLines, lines.length);
                return lines;
            });

            const rowHeight = Math.max(cellHeight, maxLines * lineHeight + this.padding * 2);
            this.checkPageBreak(rowHeight + 4);

            const rowY = this.currentY;

            rowData.forEach((lines, colIndex) => {
                const x = this.margin + colIndex * cellWidth;

                this.pdf.rect(x, rowY, columnWidths[colIndex], rowHeight);

                // center the text block vertically within the row
                const blockHeight = lines.length * lineHeight;
                const topPad = (rowHeight - blockHeight) / 2;

                lines.forEach((line: string, lineIndex: number) => {
                    this.pdf.text(
                        line,
                        x + this.padding,
                        rowY + topPad + lineIndex * lineHeight,
                        { baseline: 'middle' }
                    );
                });
            });

            this.currentY += rowHeight;
        });

        this.currentY += 10;
    }

    // ── Registration ──────────────────────────────────────────────────────────
    private checkPageBreak(requiredSpace: number) {
        if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
            this.pdf.addPage();
            this.currentY = this.margin;
        }
    };

    private addMetricsGrid(metrics: ReportData['metrics']) {
        this.addSection('Key Performance Metrics');

        const metricsData = [
            ['Metric', 'Value', 'Description'],
            ['Average Time to Hire', `${metrics.averageTimeToHire} days`, 'Time from application to hire'],
            ['Application to Interview Rate', `${metrics.applicationToInterviewRate}%`, 'Screening effectiveness'],
            ['Interview to Offer Rate', `${metrics.interviewToOfferRate}%`, 'Interview success rate'],
            ['Offer Acceptance Rate', `${metrics.offerAcceptanceRate}%`, 'Candidate acceptance rate'],
            ['Cost per Hire', `$${metrics.costPerHire.toLocaleString()}`, 'Average recruitment cost'],
            ['Quality of Hire', `${metrics.qualityOfHire}/5.0`, 'Performance rating']
        ];

        this.addTable(metricsData[0], metricsData.slice(1));
    };

    private addSummarySection(summary: ReportData['summary']) {
        this.addSection('Executive Summary');

        this.addText(`Total Applications: ${summary.totalApplications.toLocaleString()}`, 12, true);
        this.addText(`Active Candidates: ${summary.totalCandidates.toLocaleString()}`, 12, true);
        this.addText(`Open Positions: ${summary.totalJobs.toLocaleString()}`, 12, true);
        this.addText(`Interviews Conducted: ${summary.totalInterviews.toLocaleString()}`, 12, true);
        this.addText(`Successful Hires: ${summary.hiredCandidates.toLocaleString()}`, 12, true);

        this.currentY += 10;
    };

    private addJobBreakdown(breakdown: ReportData['breakdown']) {
        this.addSection('Applications by Job Position');

        const jobData = [
            ['Job Title', 'Applications', 'Percentage'],
            ...breakdown.applicationsByJob.slice(0, 10).map(job => {
                const total = breakdown.applicationsByJob.reduce((sum, j) => sum + j.count, 0);
                const percentage = total > 0 ? ((job.count / total) * 100).toFixed(1) : '0';
                return [job.jobTitle, job.count.toString(), `${percentage}%`];
            })
        ];

        this.addTable(jobData[0], jobData.slice(1));
    };

    private addSourceAnalysis(sourceAnalysis: ReportData['sourceAnalysis']) {
        this.addSection('Source Performance Analysis');

        const sourceData = [
            ['Source', 'Applications', 'Hires', 'Conversion Rate'],
            ...sourceAnalysis.map(source => [
                source.source,
                source.applications.toString(),
                source.hires.toString(),
                `${source.conversionRate}%`
            ])
        ];

        this.addTable(sourceData[0], sourceData.slice(1));
    };

    public async generateExecutiveSummary(data: ReportData): Promise<Blob> {
        this.addHeader('Executive Summary Report', data.dateRange);
        this.addSummarySection(data.summary);
        this.addMetricsGrid(data.metrics);
        this.addJobBreakdown(data.breakdown);
        this.addSourceAnalysis(data.sourceAnalysis);

        return new Blob([this.pdf.output('blob')], { type: 'application/pdf' });
    };

    public async generateDetailedReport(data: ReportData): Promise<Blob> {
        this.addHeader('Detailed Analytics Report', data.dateRange);
        this.addSummarySection(data.summary);
        this.addMetricsGrid(data.metrics);
        this.addJobBreakdown(data.breakdown);
        this.addSourceAnalysis(data.sourceAnalysis);

        // Add insights section
        this.addSection('Key Insights & Recommendations');
        this.addText('• Focus on high-performing sources like referrals and company website', 10);
        this.addText('• Consider optimizing the interview process to improve conversion rates', 10);
        this.addText('• Monitor time-to-hire metrics to maintain competitive advantage', 10);
        this.addText('• Implement diversity initiatives to improve candidate pool quality', 10);

        return new Blob([this.pdf.output('blob')], { type: 'application/pdf' });
    };

    // ── Generate Tables ──────────────────────────────────────────────────────────
    public async generateTable(table: string, rows: string[][]): Promise<Blob> {
        const headers = TABLE_HEADER[table];

        this.addHeader("Job")
        this.addSection("Table name")
        this.pdf.autoTable({
            head: [headers],
            body: rows,
            startY: this.currentY,
            margin: { left: this.margin, right: this.margin },
        });

        return new Blob([this.pdf.output('blob')], { type: 'application/pdf' })
    };

    public async captureChartAsPDF(chartElementId: string, title: string): Promise<Blob> {
        const chartElement = document.getElementById(chartElementId);
        if (!chartElement) {
            throw new Error('Chart element not found');
        };

        const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 2
        });

        this.addHeader(`Chart Export: ${title}`, {
            from: new Date(),
            to: new Date()
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = this.pageWidth - 2 * this.margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        this.pdf.addImage(imgData, 'PNG', this.margin, this.currentY, imgWidth, imgHeight);

        return new Blob([this.pdf.output('blob')], { type: 'application/pdf' });
    };
};

export const downloadPDF = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

export const exportChartAsImage = async (chartElementId: string, filename: string) => {
    const chartElement = document.getElementById(chartElementId);
    if (!chartElement) {
        throw new Error('Chart element not found');
    };

    const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2
    });

    canvas.toBlob((blob) => {
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        };
    }, 'image/png');
};
