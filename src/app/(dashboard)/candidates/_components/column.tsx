'use client'

import {ColumnDef} from "@tanstack/react-table";
import {ApplicationResponseType} from "@/types/job-listings-types";
import React from "react";
import IndeterminateCheckbox from "@/components/indeterminate-checkbox";
import {Ellipsis} from "lucide-react";


export const columns: ColumnDef<ApplicationResponseType>[] = [
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
        cell: ({ row }) => row.original.candidate_name
    },
    {
        accessorKey: "location",
        header: 'Location',
        cell: ({ row }) => row.original.job_location
    },
    {
        id: "action",
        header: '',
        cell: () => (
            <div className="flex items-center">
                <Ellipsis size={20}/>
            </div>
        )
    },

]