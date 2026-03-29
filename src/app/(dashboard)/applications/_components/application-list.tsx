"use client";

import React, {useState} from "react";
import {ApplicationResponseType} from "@/types";
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

type Props = {
    application: ApplicationResponseType[];
    pageCount: number;
};

const ApplicationList = ({application, pageCount}: Props) => {
    const [selectedRow, setSelectedRow] =
        useState<ApplicationResponseType | null>(null);

    return (
        <>
            <div className="rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <DataTable<ApplicationResponseType>
                    columns={columns}
                    data={application}
                    status="application"
                    onRowClick={(rowData) => setSelectedRow(rowData)}
                />
                <PaginationElement pageCount={pageCount}/>
            </div>
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
