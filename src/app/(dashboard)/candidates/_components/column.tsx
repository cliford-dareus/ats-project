'use client'

import {ColumnDef, createColumnHelper} from "@tanstack/react-table";
import {CandidatesResponseType} from "@/types";
import React from "react";
import IndeterminateCheckbox from "@/components/indeterminate-checkbox";
import RowAction from "@/app/(dashboard)/candidates/_components/row-action";

const columnHelper  = createColumnHelper<CandidatesResponseType>()

export const columns: ColumnDef<CandidatesResponseType>[] = [
    {
        id: 'select',
        header: ({ table }) => (
            <IndeterminateCheckbox
                {...{
                    checked: table.getIsAllRowsSelected(),
                    indeterminate: table.getIsSomeRowsSelected(),
                    onChange: table.getToggleAllRowsSelectedHandler(),
                }}
            />
        ),
        cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()} className="px-1">
                <IndeterminateCheckbox
                    {...{
                        checked: row.getIsSelected(),
                        disabled: !row.getCanSelect(),
                        indeterminate: row.getIsSomeSelected(),
                        onChange: row.getToggleSelectedHandler(),
                    }}
                />
            </div>
        ),
    },
    {
        accessorKey: "Name",
        header: 'Name',
        cell: ({ row }) => row.original.name
    },
    {
        accessorKey: "Email",
        header: 'Email',
        cell: ({ row }) => row.original.email
    },
    {
        accessorKey: "Phone",
        header: 'Phone',
        cell: ({ row }) => row.original.phone
    },
    {
        accessorKey: "Status",
        header: 'Status',
        cell: ({ row }) => row.original.status
    }, columnHelper.display({
        id: "action",
        cell: RowAction
    }),
];
