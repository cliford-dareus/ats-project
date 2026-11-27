"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { CandidatesResponseType } from "@/types";
import React from "react";
import IndeterminateCheckbox from "@/components/indeterminate-checkbox";
import RowAction from "@/app/(dashboard)/candidates/_components/row-action";
import { cn, getCandidateStatusColor } from "@/lib/utils";

const columnHelper = createColumnHelper<CandidatesResponseType>();

// Initials for the avatar circle (no avatar image is stored anywhere).
const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("") || "?";
};

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
        <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden border-2 border-white shadow-lg flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
                {getInitials(row.original.name)}
            </span>
        </div>
        <div>
            <h4 className="text-sm text-foreground font-bold group-hover:text-primary transition-colors">
                {row.original.name}
            </h4>
            <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mt-1">
                {row.original.email}
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
