'use client';

import React from 'react';
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TABLE_HEADER_MAP } from '@/lib/constant';
import { downloadPDF, PDFGenerator } from '@/lib/pdf-generator';
import { format } from "date-fns";
import { ApplicationResponseType, CandidatesResponseType, JobResponseType } from '@/types';

type Props = {
    file_name: string;
    data: JobResponseType[] | CandidatesResponseType[] | ApplicationResponseType[];
};

const ExtractFileButton = ({ file_name, data }: Props) => {
    // Untyped rows on purpose: the rows are one of three response shapes and
    // the headers are looked up by table name, so keys are resolved
    // dynamically (lowercased) at runtime.
    const get_table_rows = (data: Record<string, unknown>[], headers: string[]): string[][] => {
        return data.map(item => {
            return headers.map(k => {
                const key = k.toLowerCase()
                const value = item[key];
                if (value instanceof Date) {
                    return new Intl.DateTimeFormat('en-US').format(value)
                }
                // Null cells used to format as the epoch (new Date(null)) —
                // keep that so exported tables don't change.
                if (value === null) {
                    return new Intl.DateTimeFormat('en-US').format(new Date(0))
                }
                return String(value ?? '')
            }
            );
        })
    };

    const generate_table = async () => {
        const table_header = TABLE_HEADER_MAP[file_name] as (keyof typeof data[number])[];

        try {
            const pdfGenerator = new PDFGenerator
            const rows = get_table_rows(data, table_header);
            const pdfBlob: Blob = await pdfGenerator.generateTable(file_name, rows);
            const filename = `${file_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            console.log(rows)
            downloadPDF(pdfBlob, filename);
        } catch (e) {
            console.error('Report generation failed:', e);
            alert('Failed to generate report. Please try again.');
        }
    };

    return (
        <Button
            variant="outline"
            className="!py-2 border rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2"
            onClick={() => generate_table()}
        >
            <FileDown size={18} />
            Export
        </Button>
    );
};

export default ExtractFileButton;
