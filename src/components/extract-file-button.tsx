'use client';

import React from 'react';
import {FileDown} from "lucide-react";

type Props = {
    status: string
};

const ExtractFileButton = ({status}: Props) => {
    const extractFile = async () => {
        const {jsPDF} = await import("jspdf"); // Dynamically import jsPDF
        const autoTable = (await import("jspdf-autotable")).default;

        const pdf = new jsPDF();
        pdf.text("Sample Table Report", 14, 20);

        autoTable(pdf, {html: `#table-${status}`});
        pdf.save('Todos.pdf');
    };

    return (
        <div className="p-1 border rounded cursor-pointer hover:bg-blue-300" onClick={() => extractFile()}>
            <FileDown size={18}/>
        </div>
    );
};

export default ExtractFileButton;