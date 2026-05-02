"use client";

import {ColumnDef, createColumnHelper} from "@tanstack/react-table";
import {JobResponseType} from "@/types";
import React from "react";
import IndeterminateCheckbox from "@/components/indeterminate-checkbox";
import RowAction from "@/app/(dashboard)/jobs/[joblistingId]/_components/row-action";
import {Clock, MapPin, Users} from "lucide-react";

const columnHelper = createColumnHelper<JobResponseType>();

export const columns: ColumnDef<JobResponseType>[] = [
    {
        id: "select",
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
        accessorKey: "job title",
        header: "Job Title",
        cell: ({row}) => (
            <div className="flex items-center gap-2">
                <div
                    className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                    <Users className="w-6 h-6 text-zinc-400"/>
                </div>
                <div className="flex flex-col">
                    <span className="text-xl font-semibold text-zinc-900">
                      {row.original.name}
                    </span>

                    <div className="flex">
                        <div className="flex items-center text-sm text-zinc-500">
                            <Clock size={16}/>
                            <span className="ml-1">Full-time</span>
                        </div>
                        <span className="text-zinc-300 ml-2">•</span>
                        <span className="ml-2 ">{row.original.department}</span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        accessorKey: "location",
        header: "Location",
        cell: ({row}) => (
            <div className="flex items-center text-sm text-zinc-500 gap-1">
                <MapPin size={16}/>
                <span>{row.original.location}</span>
            </div>
        ),
    },
    {
        accessorKey: "applicants No",
        header: "Applicants No.",
        cell: ({row}) => (
            <div className="mr-4">
                <span className="text-lg font-bold text-zinc-900">{row.original.candidatesCount}</span>
                <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Applicants</p>
            </div>
        )
    },
    {
        accessorKey: "published At",
        header: "Published At",
        cell: ({row}) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({row}) => (
            <div className="px-4 py-1 rounded-full w-min text-xs font-bold border uppercase tracking-wider">
                {row.original.status}
            </div>),
    },
    columnHelper.display({
        id: "action",
        cell: RowAction,
    }),
];
