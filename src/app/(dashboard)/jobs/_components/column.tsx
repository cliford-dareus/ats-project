'use client'

import {ColumnDef} from "@tanstack/react-table";
import {JobResponseType} from "@/types/job-listings-types";
import React from "react";
import IndeterminateCheckbox from "@/app/(dashboard)/jobs/_components/indeterminate-checkbox";
import {Ellipsis} from "lucide-react";


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
        id: "action",
        header: '',
        cell: () => (
            <div className="flex items-center">
                <Ellipsis size={20}/>
            </div>
        )
    },

]