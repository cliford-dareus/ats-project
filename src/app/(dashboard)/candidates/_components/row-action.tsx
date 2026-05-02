import React from 'react';
import {Ellipsis} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {CandidatesResponseType} from "@/types";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const RowAction = ({ row, table }) => {
    const candidate = row.original as CandidatesResponseType;
    const meta = table.options.meta;
    const validRow = meta?.validRows[row.id];
    const disableSubmit = validRow ? Object.values(validRow)?.some(value => !value): false;

  return (
      <>
          <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={disableSubmit}>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <Ellipsis size={18}/>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                      onClick={() => navigator.clipboard.writeText(candidate.id.toString())}
                  >
                      Copy candidate ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Edit candidate</DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
      </>
  );
};

export default RowAction;
