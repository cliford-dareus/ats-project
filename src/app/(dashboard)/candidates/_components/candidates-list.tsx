"use client"

import React, { useState } from 'react';
import DataTable from "@/components/data-table";
import { columns } from "@/app/(dashboard)/candidates/_components/column";
import PaginationElement from "@/components/pagination";
import { CandidatesResponseType, } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import CandidatePreview from "@/app/(dashboard)/candidates/_components/candidate-preview";
import DeleteCandidateModal from "@/components/modal/delete-candidate-modal";
import { bulk_update_candidate_status_action, delete_candidate_action } from "@/server/actions/candidates-actions";
import { CANDIDATE_STATUS } from "@/zod";
import { useHasPermission } from "@/lib/use-permission";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
    candidate: CandidatesResponseType[],
    pageCount: number
}

const CandidatesList = ({ candidate, pageCount }: Props) => {
    const [selectedRow, setSelectedRow] = useState<CandidatesResponseType | null>(null);
    const [selected, setSelected] = useState<CandidatesResponseType[]>([]);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [bulkStatus, setBulkStatus] = useState<string>("");
    // Bumps after a bulk op so the table remounts and its internal
    // rowSelection (owned by DataTable) clears with the parent selection.
    const [tableKey, setTableKey] = useState(0);
    const hasPermission = useHasPermission();
    const canDelete = hasPermission("candidate:delete");
    const canEdit = hasPermission("candidate:edit");
    const router = useRouter();

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        setBulkError(null);
        for (const c of selected) {
            const result = await delete_candidate_action(c.id);
            if (result && "error" in result) {
                setBulkError(result.message ?? "There was an error deleting a candidate");
                setIsDeleting(false);
                return;
            }
        }
        setIsDeleting(false);
        setIsDeleteOpen(false);
        setSelected([]);
        setTableKey((k) => k + 1);
        router.refresh();
    };

    const handleBulkStatus = async (status: string) => {
        setBulkStatus("");
        setBulkError(null);
        const parsed = CANDIDATE_STATUS.safeParse(status);
        if (!parsed.success) return;
        const result = await bulk_update_candidate_status_action(
            selected.map((c) => c.id),
            parsed.data,
        );
        if (result && "error" in result) {
            setBulkError(result.message ?? "There was an error updating candidates");
            return;
        }
        setSelected([]);
        setTableKey((k) => k + 1);
        router.refresh();
    };

    return (
        <>
            {selected.length > 0 && (
                <div className="flex items-center gap-3 p-3 mb-2 bg-muted border rounded-2xl">
                    <span className="text-sm font-bold">
                        {selected.length} selected
                    </span>
                    {canEdit && (
                        <Select value={bulkStatus} onValueChange={handleBulkStatus}>
                            <SelectTrigger className="w-[180px] bg-background">
                                <SelectValue placeholder="Change status…" />
                            </SelectTrigger>
                            <SelectContent>
                                {CANDIDATE_STATUS.options.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status.charAt(0) + status.slice(1).toLowerCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {canDelete && (
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteOpen(true)}
                            disabled={isDeleting}
                        >
                            Delete {selected.length === 1 ? "candidate" : `${selected.length} candidates`}
                        </Button>
                    )}
                    <Button variant="ghost" onClick={() => setSelected([])}>
                        Clear
                    </Button>
                    {bulkError && (
                        <span className="text-xs text-red-600">{bulkError}</span>
                    )}
                </div>
            )}

            <div className="rounded-2xl border border-border shadow-sm overflow-hidden">
                <DataTable<CandidatesResponseType>
                    key={tableKey}
                    columns={columns} data={candidate}
                    status="candidates"
                    onRowClick={(rowData) => setSelectedRow(rowData)}
                    onRowSelectionChange={setSelected}
                />
                <PaginationElement pageCount={pageCount} />
            </div>

            <DeleteCandidateModal
                isOpen={isDeleteOpen}
                setIsOpen={setIsDeleteOpen}
                candidates={selected}
                confirming={isDeleting}
                onConfirm={handleBulkDelete}
            />

            <Sheet open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
                <SheetHeader>
                    <SheetTitle></SheetTitle>
                </SheetHeader>
                <SheetContent side="right" className="sm:max-w-xl p-0 [&>button:first-of-type]:hidden">
                    {selectedRow && <CandidatePreview
                        data={selectedRow as CandidatesResponseType}
                        candidates={candidate as CandidatesResponseType[]}/>
                    }
                </SheetContent>
            </Sheet>
        </>
    );
};

export default CandidatesList;
