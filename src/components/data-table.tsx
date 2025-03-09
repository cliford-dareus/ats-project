'use client'

import React from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable
} from "@tanstack/react-table";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import CandidatePreview from "@/app/(dashboard)/applications/_components/candidate-preview";
import {Sheet, SheetContent} from "@/components/ui/sheet";
import {ApplicationResponseType, CandidatesResponseType, JobResponseType} from "@/types/job-listings-types";
import JobPreview from "@/app/(dashboard)/jobs/_components/job-preview";

interface Props<T extends object> {
    columns: ColumnDef<T>[];
    data: T[];
    status: string;
}

const DataTable = <T extends object>({columns, data, status}: Props<T>) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [applicationSelected, setApplicationSelected] = React.useState<ApplicationResponseType | CandidatesResponseType | JobResponseType | null>(null);
    const [rowSelection, setRowSelection] = React.useState({});
    const [validRows, setValidRows] = React.useState({});

    const table = useReactTable<T>({
        data,
        columns,
        state: {
            rowSelection,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        meta: {
            validRows,
            setValidRows,
        },
        // debugTable: true,
    });

    return (
        <Table id={`table-${status}`}>
            <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map(header => {
                            return (
                                <TableHead key={header.id} colSpan={header.colSpan}>
                                    {header.isPlaceholder ? null : (
                                        <>
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {header.column.getCanFilter() ? (
                                                <div>
                                                    {/*<Filter column={header.column} table={table}/>*/}
                                                </div>
                                            ) : null}
                                        </>
                                    )}
                                </TableHead>
                            )
                        })}
                    </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows.map((row) => {
                    return (
                        <Sheet open={isOpen} onOpenChange={setIsOpen} key={row.id}>
                            {/*<SheetTrigger asChild>*/}
                            <TableRow>
                                {row.getVisibleCells().map(cell => {
                                    return (
                                        <TableCell
                                            className="cursor-pointer"
                                            key={cell.id}
                                            onClick={() => {
                                                if (cell.column.columnDef.id === 'select' || cell.column.columnDef.id == 'action') return
                                                // router.push(`/${status}/:${(cell.row.original as SCHEMA).id}`);
                                                setApplicationSelected(row.original as ApplicationResponseType | JobResponseType | CandidatesResponseType)
                                                setIsOpen(!isOpen)
                                            }}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                            {/*</SheetTrigger>*/}
                            <SheetContent side="right" className="sm:max-w-xl p-0">
                                {status === 'application' ?
                                    <CandidatePreview
                                        data={applicationSelected as ApplicationResponseType}
                                        applications={data as ApplicationResponseType[]}
                                    /> :
                                    <JobPreview data={applicationSelected as JobResponseType}/>}
                            </SheetContent>
                        </Sheet>
                    )
                })}
            </TableBody>
        </Table>
    )
};

export default DataTable;