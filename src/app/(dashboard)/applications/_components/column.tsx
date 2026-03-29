'use client'

import {ColumnDef} from "@tanstack/react-table";
import {ApplicationResponseType} from "@/types";
import React from "react";
import IndeterminateCheckbox from "@/components/indeterminate-checkbox";
import {Ellipsis} from "lucide-react";


export const columns: ColumnDef<ApplicationResponseType>[] = [
    {
        id: 'select',
        header: ({table}) => (
            <div className="px-4">
                <IndeterminateCheckbox
                    {...{
                        checked: table.getIsAllRowsSelected(),
                        indeterminate: table.getIsSomeRowsSelected(),
                        onChange: table.getToggleAllRowsSelectedHandler(),
                    }}
                />
            </div>
        ),
        cell: ({row}) => (
            <div className="px-4">
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
        cell: ({row}) => (
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-background overflow-hidden border-2 border-white shadow-sm">
                    {/*<img src={app.avatar} alt={app.name} />*/}
                </div>
                <div>
                    <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{row.original.candidate_name}</h4>
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mt-1">{row.original.candidate_email}</p>
                </div>
            </div>
        )
    },
    {
        accessorKey: "Role",
        header: 'Role',
        cell: ({row}) => row.original.job_apply
    },
    {
        accessorKey: "location",
        header: 'Location',
        cell: ({row}) => row.original.location
    },
    {
        accessorKey: "stage",
        header: 'Status',
        cell: ({row}) => (
            <div className="px-2.5 py-1 rounded-full text-xs font-medium border w-1/2 text-center">
                {row.original.current_stage}
            </div>
        )
    },
    {
        id: "action",
        header: 'action',
        cell: () => (
            <div className="flex items-center">
                <Ellipsis size={20}/>
            </div>
        )
    },

]