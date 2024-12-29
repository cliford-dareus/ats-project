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
import {JobResponseType} from "@/types/job-listings-types";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {useRouter} from "next/navigation";

type Props = {
    columns: ColumnDef<JobResponseType>[];
    data: JobResponseType[];
}

const DataTable = ({columns, data}: Props) => {
    const router = useRouter();
    const [rowSelection, setRowSelection] = React.useState({})
    const table = useReactTable({
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

    console.log(rowSelection)

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
                {table.getRowModel().rows.map(row => {
                    return (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map(cell => {
                                return (
                                    <TableCell
                                        className="cursor-pointer"
                                        key={cell.id}
                                        onClick={() => {
                                            if (cell.column.columnDef.id === 'select' || cell.column.columnDef.id == 'action') return
                                            router.push(`/jobs/${(cell.row.original as JobResponseType).id}`);
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
                    )
                })}
            </TableBody>
        </Table>
    )
};

export default DataTable;