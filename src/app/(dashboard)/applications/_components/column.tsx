'use client'

import {ColumnDef} from "@tanstack/react-table";
import {ApplicationResponseType} from "@/types";
import React from "react";
import RowAction from "./row-action";


// NOTE (L-13): the select column was removed — row checkboxes kept local
// TanStack rowSelection with no consumer. Bulk actions for this list are a
// follow-up once the shared DataTable onRowSelectionChange callback lands.

export const columns: ColumnDef<ApplicationResponseType>[] = [
    {
        accessorKey: "Name",
        header: 'Name',
        cell: ({row}) => (
            <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-full bg-background overflow-hidden border-2 border-white shadow-lg">
                    {/*<img src={app.avatar} alt={app.name} />*/}
                </div>
                <div>
                    <h4 className="text-sm text-foreground font-bold group-hover:text-primary truncate tracking-tight transition-colors">{row.original.candidate_name}</h4>
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
            <div className="px-4 py-1 rounded-full text-xs font-medium border w-min text-center">
                {row.original.current_stage}
            </div>
        )
    },
    {
        id: "action",
      header: 'action',
      cell: RowAction
    },

]