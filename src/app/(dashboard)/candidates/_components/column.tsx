'use client'

import {ColumnDef} from "@tanstack/react-table";
import {CandidatesResponseType} from "@/types";
import React from "react";
import IndeterminateCheckbox from "@/components/indeterminate-checkbox";
import {Ellipsis} from "lucide-react";


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