"use client"

import PaginationElement from "@/components/pagination";
import {JobResponseType} from "@/types";
import DataTable from "@/components/data-table";
import {columns} from "@/app/(dashboard)/jobs/_components/column";
import React, {useState} from "react";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import JobPreview from "@/app/(dashboard)/jobs/_components/job-preview";
import { delete_job_action, update_job_action } from "@/server/actions/job-listings-actions";
import { JOB_STATUS } from "@/zod";
import { useHasPermission } from "@/lib/use-permission";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type Props = {
    jobs: JobResponseType[];
    pageCount: number;
};

const JobListingsList = ({jobs, pageCount}: Props) => {
    const [selectedRow, setSelectedRow] = useState<JobResponseType | null>(null);
    const [selected, setSelected] = useState<JobResponseType[]>([]);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [bulkStatus, setBulkStatus] = useState<string>("");
    // Bumps after a bulk op so the table remounts and its internal
    // rowSelection (owned by DataTable) clears with the parent selection.
    const [tableKey, setTableKey] = useState(0);
    const hasPermission = useHasPermission();
    const canDelete = hasPermission("job:delete");
    const canEdit = hasPermission("job:edit");
    const router = useRouter();

    // B11: the select column finally has consumers — bulk status change
    // and bulk delete (soft-delete via the existing action, which also
    // moves the job's live applications to Trash).
    const handleBulkDelete = async () => {
        setIsDeleting(true);
        setBulkError(null);
        for (const job of selected) {
            const result = await delete_job_action(job.id);
            if (result && "error" in result) {
                setBulkError(result.message ?? "There was an error deleting a job");
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
        const parsed = JOB_STATUS.safeParse(status);
        if (!parsed.success) return;
        for (const job of selected) {
            const result = await update_job_action({ jobId: job.id, status: parsed.data });
            if (result && "error" in result) {
                setBulkError(result.message ?? "There was an error updating jobs");
                return;
            }
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
                                {JOB_STATUS.options.map((status) => (
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
                            Delete {selected.length === 1 ? "job" : `${selected.length} jobs`}
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
                <DataTable<JobResponseType>
                    key={tableKey}
                    columns={columns} data={jobs}
                    status="jobs"
                    onRowClick={(rowData) => setSelectedRow(rowData)}
                    onRowSelectionChange={setSelected}
                />
                <PaginationElement pageCount={pageCount}/>
            </div>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {selected.length === 1 ? "job" : `${selected.length} jobs`}?</DialogTitle>
                        <DialogDescription>
                            This moves the selected {selected.length === 1 ? "job" : "jobs"} to Trash, along with {selected.length === 1 ? "its" : "their"} live applications. You can restore them from Trash, or delete them forever there.
                        </DialogDescription>
                    </DialogHeader>
                    {bulkError && (
                        <p className="text-xs text-red-600">{bulkError}</p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                            {isDeleting ? "Deleting…" : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Sheet open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
                <SheetHeader>
                    <SheetTitle></SheetTitle>
                </SheetHeader>
                <SheetContent side="right" className="sm:max-w-xl p-0 [&>button:first-of-type]:hidden">
                    {selectedRow && <JobPreview
                        data={selectedRow as JobResponseType}
                        jobs={jobs as JobResponseType[]}/>
                    }
                </SheetContent>
            </Sheet>
        </>
    )
};

export default JobListingsList;
