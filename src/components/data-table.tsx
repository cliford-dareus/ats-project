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
// import type {candidatesResponseType, JobResponseType} from "@/types/job-listings-types";
import CandidatePreview from "@/app/(dashboard)/candidates/_components/candidate-preview";
import {Sheet, SheetContent, SheetTrigger} from "@/components/ui/sheet";
import {ApplicationResponseType} from "@/types/job-listings-types";

interface Props<T extends object> {
    columns: ColumnDef<T>[];
    data: T[];
    status: string;
}

// type SCHEMA = JobResponseType | candidatesResponseType

const DataTable = <T extends object>({columns, data, status}: Props<T>) => {
    const [rowSelection, setRowSelection] = React.useState({});
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
        debugTable: true,
    })

    return (
        <Table>
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
                        <Sheet key={row.id}>
                            <SheetTrigger asChild>
                                <TableRow>
                                    {row.getVisibleCells().map(cell => {
                                        return (
                                            <TableCell
                                                className="cursor-pointer"
                                                key={cell.id}
                                                onClick={() => {
                                                    if (cell.column.columnDef.id === 'select' || cell.column.columnDef.id == 'action') return
                                                    // router.push(`/${status}/:${(cell.row.original as SCHEMA).id}`);
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
                            </SheetTrigger>
                            <SheetContent side="right">
                                {status === 'application'? <CandidatePreview data={row.original as ApplicationResponseType}/> : null}
                            </SheetContent>
                        </Sheet>
                    )
                })}
            </TableBody>
        </Table>
    )
};

export default DataTable;