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
import DeleteJoblistingModal from "@/components/modal/delete-joblisting-modal";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const RowAction = ({row, table}) => {
    const meta = table.options.meta;
    const validRow = meta?.validRows[row.id];
    const disableSubmit = validRow ? Object.values(validRow)?.some(value => !value) : false;
    const [isEditJobOpen, setIsEditJobOpen] = useState(false);
    const [isDeleteJobOpen, setIsDeleteJobOpen] = useState(false);

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
                        <div onClick={() => setIsEditJobOpen(true)}>Edit job</div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <div onClick={() => setIsDeleteJobOpen(true)}>Delete Job</div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EditJobListingModal isEditJobOpen={isEditJobOpen} setIsEditJobOpen={setIsEditJobOpen} data={row.original}/>
            <DeleteJoblistingModal isDeleteJobOpen={isDeleteJobOpen} setIsDeleteJobOpen={setIsDeleteJobOpen} data={row.original} />
        </>
    );
};

export default RowAction;
