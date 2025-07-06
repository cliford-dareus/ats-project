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

interface Props<T extends object> {
    columns: ColumnDef<T>[];
    data: T[];
    status: string;
    onRowClick?: (data: T) => void;
};

const DataTable = <T extends object>({columns, data, onRowClick, status}: Props<T>) => {
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
                        <TableRow
                            key={row.id}

                            className="cursor-pointer hover:bg-muted/50"
                        >
                            {row.getVisibleCells().map(cell => {
                                return (
                                    <TableCell
                                        key={cell.id}
                                        onClick={() => {
                                            if (cell.column.id === "action" || cell.column.id === "select") return;
                                            onRowClick?.(row.original)
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
