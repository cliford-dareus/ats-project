"use client";

import React, {useRef, useState} from "react";
import {ApplicationResponseType} from "@/types";
import DataTable from "@/components/data-table";
import {columns} from "@/app/(dashboard)/applications/_components/column";
import PaginationElement from "@/components/pagination";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import ApplicationPreview from "@/app/(dashboard)/applications/_components/application-preview";
import { delete_application_action, update_application_stage_action } from "@/server/actions/application_actions";
import { get_job_listings_stages_action } from "@/server/actions/job-listings-actions";
import { update_candidate_action } from "@/server/actions/candidates-actions";
import { create_note } from "@/server/queries/mongo/note";
import { JOB_STAGES } from "@/zod";
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

// Same rejection reasons as the job→candidates tab and the application
// detail header, so bulk reject writes the same NEGATIVE note.
const REJECTION_REASONS = [
    "Not qualified",
    "Position filled",
    "No response",
    "Other",
] as const;

type StageRow = { id: number; stage_name: string | null };

type Props = {
    application: ApplicationResponseType[];
    pageCount: number;
};

const ApplicationList = ({application, pageCount}: Props) => {
    const [selectedRow, setSelectedRow] =
        useState<ApplicationResponseType | null>(null);
    const [selected, setSelected] = useState<ApplicationResponseType[]>([]);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isBulkBusy, setIsBulkBusy] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [bulkStage, setBulkStage] = useState<string>("");
    const [bulkRejectReason, setBulkRejectReason] = useState<string>("");
    // Bumps after a bulk op so the table remounts and its internal
    // rowSelection (owned by DataTable) clears with the parent selection.
    const [tableKey, setTableKey] = useState(0);
    // Stages are per-job — cache each job's stage list so a bulk move
    // across many jobs fetches each job's stages at most once.
    const stagesCache = useRef(new Map<number, StageRow[]>());
    const hasPermission = useHasPermission();
    const canMove = hasPermission("application:move");
    const canDelete = hasPermission("application:delete");
    const canReject = hasPermission("candidate:edit");
    const router = useRouter();

    const getStagesForJob = async (jobId: number): Promise<StageRow[]> => {
        const cached = stagesCache.current.get(jobId);
        if (cached) return cached;
        const result = await get_job_listings_stages_action(jobId);
        const stages = Array.isArray(result) ? (result as StageRow[]) : [];
        stagesCache.current.set(jobId, stages);
        return stages;
    };

    const finishBulk = () => {
        setSelected([]);
        setTableKey((k) => k + 1);
        router.refresh();
    };

    // B11: bulk stage-move. Stages are job-scoped, so the target stage is
    // resolved per application from its own job's stage list; the server
    // action re-verifies the stage belongs to that application's job.
    const handleBulkStageMove = async (stageName: string) => {
        setBulkStage("");
        setBulkError(null);
        if (selected.length === 0) return;
        setIsBulkBusy(true);
        let moved = 0;
        let skipped = 0;
        try {
            for (const app of selected) {
                const stages = await getStagesForJob(app.job_id);
                const target = stages.find((stage) => stage.stage_name === stageName);
                if (!target) {
                    skipped += 1;
                    continue;
                }
                const result = await update_application_stage_action({
                    applicationId: app.id,
                    new_stage_id: target.id,
                });
                if (result && "error" in result) {
                    setBulkError(result.message ?? "There was an error moving applications");
                    setIsBulkBusy(false);
                    return;
                }
                moved += 1;
            }
            if (skipped > 0) {
                setBulkError(
                    `${moved} moved, ${skipped} skipped — ${skipped === 1 ? "its job has" : "their jobs have"} no "${stageName}" stage.`,
                );
            }
            finishBulk();
        } catch (err) {
            setBulkError((err as Error).message || "There was an error moving applications");
        } finally {
            setIsBulkBusy(false);
        }
    };

    // B11: bulk reject — same path as the job→candidates tab: candidate
    // REJECTED + a NEGATIVE "Rejected: <reason>" note per candidate.
    const handleBulkReject = async (reason: string) => {
        setBulkRejectReason("");
        setBulkError(null);
        if (selected.length === 0) return;
        setIsBulkBusy(true);
        try {
            for (const app of selected) {
                const result = await update_candidate_action({
                    id: app.candidate_id,
                    status: "REJECTED",
                });
                if (result && "error" in result) {
                    setBulkError(result.message ?? "There was an error rejecting applications");
                    setIsBulkBusy(false);
                    return;
                }
                await create_note({
                    text: `Rejected: ${reason}`,
                    note_id: `candidate_${app.candidate_id}`,
                    note_type: "candidate",
                    candidate_id: app.candidate_id,
                    type: "NEGATIVE",
                    mentions: [],
                });
            }
            finishBulk();
        } catch (err) {
            setBulkError((err as Error).message || "There was an error rejecting applications");
        } finally {
            setIsBulkBusy(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        setBulkError(null);
        for (const app of selected) {
            const result = await delete_application_action(app.id);
            if (result && "error" in result) {
                setBulkError(result.message ?? "There was an error deleting an application");
                setIsDeleting(false);
                return;
            }
        }
        setIsDeleting(false);
        setIsDeleteOpen(false);
        finishBulk();
    };

    return (
        <>
            {selected.length > 0 && (
                <div className="flex items-center gap-3 p-3 mb-2 bg-muted border rounded-2xl">
                    <span className="text-sm font-bold">
                        {selected.length} selected
                    </span>
                    {canMove && (
                        <Select value={bulkStage} onValueChange={handleBulkStageMove} disabled={isBulkBusy}>
                            <SelectTrigger className="w-[180px] bg-background">
                                <SelectValue placeholder="Move to stage…" />
                            </SelectTrigger>
                            <SelectContent>
                                {JOB_STAGES.options.map((stage) => (
                                    <SelectItem key={stage} value={stage}>
                                        {stage}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {canReject && (
                        <Select value={bulkRejectReason} onValueChange={handleBulkReject} disabled={isBulkBusy}>
                            <SelectTrigger className="w-[180px] bg-background">
                                <SelectValue placeholder="Reject…" />
                            </SelectTrigger>
                            <SelectContent>
                                {REJECTION_REASONS.map((reason) => (
                                    <SelectItem key={reason} value={reason}>
                                        {reason}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {canDelete && (
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteOpen(true)}
                            disabled={isDeleting || isBulkBusy}
                        >
                            Delete {selected.length === 1 ? "application" : `${selected.length} applications`}
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
                <DataTable<ApplicationResponseType>
                    key={tableKey}
                    columns={columns}
                    data={application}
                    status="application"
                    onRowClick={(rowData) => setSelectedRow(rowData)}
                    onRowSelectionChange={setSelected}
                />
                <PaginationElement pageCount={pageCount}/>
            </div>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {selected.length === 1 ? "application" : `${selected.length} applications`}?</DialogTitle>
                        <DialogDescription>
                            This moves the selected {selected.length === 1 ? "application" : "applications"} to Trash, along with {selected.length === 1 ? "its" : "their"} interviews, scorecards and application notes. You can restore {selected.length === 1 ? "it" : "them"} from Trash, or delete {selected.length === 1 ? "it" : "them"} forever there. The {selected.length === 1 ? "candidate" : "candidates"} and their attachments are kept.
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
                <SheetContent
                    side="right"
                    className="sm:max-w-xl p-0 [&>button:first-of-type]:hidden"
                >
                    {selectedRow && (
                        <ApplicationPreview
                            data={selectedRow as ApplicationResponseType}
                            applications={application as ApplicationResponseType[]}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
};

export default ApplicationList;
