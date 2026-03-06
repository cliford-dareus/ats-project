'use client';

import React from 'react';
import {FileDown} from "lucide-react";
import {Button} from "@/components/ui/button";

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
        // pdf.save('Todos.pdf');
    };

    return (
        <Button variant="outline" className="rounded cursor-pointer hover:bg-blue-300" onClick={() => extractFile()}>
            <FileDown size={18}/>
            Extract File
        </Button>
    );
};

export default ExtractFileButton;