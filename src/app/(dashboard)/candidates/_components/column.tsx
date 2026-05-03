"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { CandidatesResponseType } from "@/types";
import React from "react";
import IndeterminateCheckbox from "@/components/indeterminate-checkbox";
import RowAction from "@/app/(dashboard)/candidates/_components/row-action";
import { cn, getCandidateStatusColor } from "@/lib/utils";

const columnHelper = createColumnHelper<CandidatesResponseType>();

export const columns: ColumnDef<CandidatesResponseType>[] = [
  {
    id: "select",
    header: ({ table }) => (
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
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()} className="px-4">
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
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-background overflow-hidden border-2 border-white shadow-lg">
            {/*<img src={app.avatar} alt={app.name} />*/}
        </div>
        <div>
            <h4 className="text-sm text-foreground font-bold group-hover:text-primary transition-colors">
                {row.original.name}
            </h4>
            <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mt-1">
                {row.original.candidate_email}
            </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "Email",
    header: "Email",
    cell: ({ row }) => row.original.email,
  },
  {
    accessorKey: "Phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone,
  },
  {
    accessorKey: "Status",
    header: "Status",
    cell: ({ row }) => (
      <div
        className={cn(
          "px-4 py-1 rounded-full text-xs font-medium border w-min text-center",
          getCandidateStatusColor(row.original.status!),
        )}
      >
        {row.original.status}
      </div>
    ),
  },
  columnHelper.display({
    id: "action",
    cell: RowAction,
  }),
];
