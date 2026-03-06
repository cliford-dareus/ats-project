import React, {useState} from 'react';
import {Ellipsis} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import EditJobListingModal from "@/components/modal/edit-joblisting-modal";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const RowAction = ({row, table}) => {
    const meta = table.options.meta;
    const validRow = meta?.validRows[row.id];
    const disableSubmit = validRow ? Object.values(validRow)?.some(value => !value) : false;
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={disableSubmit}>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <Ellipsis size={18}/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(row.original.id)}
                    >
                        Copy job ad ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem>
                        <div onClick={() => setIsOpen(true)}>Edit job</div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>View payment details</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EditJobListingModal isOpen={isOpen} setIsOpen={setIsOpen}/>
        </>
    );
};

export default RowAction;
