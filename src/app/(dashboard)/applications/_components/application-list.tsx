"use client";

import React, {useEffect, useState} from "react";
import {ApplicationResponseType, NoteType} from "@/types";
import DataTable from "@/components/data-table";
import {columns} from "@/app/(dashboard)/applications/_components/column";
import PaginationElement from "@/components/pagination";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import ApplicationPreview from "@/app/(dashboard)/applications/_components/application-preview";
import {get_application_notes} from "@/server/queries/mongo/note";

type Props = {
    application: ApplicationResponseType[];
    pageCount: number;
};

const ApplicationList = ({application, pageCount}: Props) => {
    const [selectedRow, setSelectedRow] =
        useState<ApplicationResponseType | null>(null);
    const [internalNotes, setInternalNotes] = useState<{notes: NoteType[]}>({notes: []});

    useEffect(() => {
        const fetchInternalNotes = async () => {
            if(selectedRow?.id){
                const internalNotes = await get_application_notes({id: selectedRow?.id, limit: 10, offset: 0})
                setInternalNotes(JSON.parse(internalNotes))
            }
        }
        fetchInternalNotes();
    }, [application, selectedRow]);

    return (
        <>
            <div className="rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <DataTable<ApplicationResponseType>
                    columns={columns}
                    data={application}
                    status="application"
                    onRowClick={(rowData) => setSelectedRow(rowData)}
                />
            </div>
            <PaginationElement pageCount={pageCount}/>
            <Sheet open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
                <SheetHeader>
                    <SheetTitle></SheetTitle>
                </SheetHeader>
                <SheetContent
                    side="right"
                    className="sm:max-w-xl p-0 [&>button:first-of-type]:hidden"
                >
                    {selectedRow && (
                        <ApplicationPreview
                            noteData={internalNotes}
                            data={selectedRow as ApplicationResponseType}
                            applications={application as ApplicationResponseType[]}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
};

export default ApplicationList;
