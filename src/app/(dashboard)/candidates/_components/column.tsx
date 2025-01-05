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
        accessorKey: "Name",
        header: 'Name',
        cell: ({ row }) => row.original.candidate_name
    },
    {
        accessorKey: "Job",
        header: 'Job',
        cell: ({ row }) => row.original.job_apply
    },
    {
        accessorKey: "location",
        header: 'Location',
        cell: ({ row }) => row.original.location
    },
    {
        accessorKey: "stage",
        header: 'Stage',
        cell: ({ row }) => row.original.current_stage
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