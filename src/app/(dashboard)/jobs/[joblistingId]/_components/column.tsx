'use client'

import {ColumnDef, createColumnHelper} from "@tanstack/react-table";
import {JobResponseType} from "@/types";
import React from "react";
import IndeterminateCheckbox from "@/components/indeterminate-checkbox";
import RowAction from "@/app/(dashboard)/jobs/[joblistingId]/_components/row-action";

const columnHelper  = createColumnHelper<JobResponseType>()

export const columns: ColumnDef<JobResponseType>[] = [
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
                <div className="px-1">
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
        accessorKey: "job title",
        header: 'Job Title',
        cell: ({ row }) => row.original.name
    },
    {
        accessorKey: "location",
        header: 'Location',
        cell: ({ row }) => row.original.location
    },
    {
        accessorKey: "applicants No",
        header: 'Applicants No.',
        cell: ({ row }) => row.original.candidatesCount
    },
    {
        accessorKey: "published At",
        header: 'Published At',
        cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString()
    }, {
        accessorKey: "status",
        header: 'Status',
        cell: ({ row }) => row.original.status
    }, columnHelper.display({
        id: "action",
        cell: RowAction
    }),

]