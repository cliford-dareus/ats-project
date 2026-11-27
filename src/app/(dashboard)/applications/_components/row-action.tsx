'use client';

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { delete_application_action } from "@/server/actions/application_actions";
import { useHasPermission } from "@/lib/use-permission";
import { DeleteIcon, EditIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const RowAction = ({ row, table }) => {
    const meta = table.options.meta;
    const validRow = meta?.validRows[row.id];
    const disableSubmit = validRow
        ? Object.values(validRow)?.some((value) => !value)
        : false;
    const router = useRouter();
    const hasPermission = useHasPermission();
    const canDelete = hasPermission("application:delete");
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const applicationId = row.original.id as number;
    const candidateName = row.original.candidate_name as string | undefined;

    // B21: Edit was dead (only set a flag no modal ever read). There is no
    // separate application edit form — the detail page is the edit surface
    // (stage moves, notes, scheduling), so Edit navigates there.
    const handleEdit = () => {
        router.push(`/applications/${applicationId}`);
    };

    const handleDelete = async () => {
        setDeleteError(null);
        setIsDeleting(true);
        try {
            const result = await delete_application_action(applicationId);
            if (result && typeof result === "object" && "error" in result && result.error) {
                setDeleteError(
                    (result as { message?: string }).message ??
                        "Failed to delete the application",
                );
                return;
            }
            setIsDeleteOpen(false);
            router.refresh();
        } catch (err) {
            setDeleteError((err as Error).message || "Failed to delete the application");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button disabled={disableSubmit} variant="ghost" onClick={handleEdit} aria-label="View application">
                <EditIcon size={18} />
            </Button>
            {canDelete && (
                <Button disabled={disableSubmit} variant="ghost" onClick={() => setIsDeleteOpen(true)} aria-label="Delete application">
                    <DeleteIcon size={18} />
                </Button>
            )}

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete application?</DialogTitle>
                        <DialogDescription>
                            {candidateName
                                ? `This deletes ${candidateName}'s application for this job, along with its interviews, scorecards and application notes.`
                                : "This deletes the application, along with its interviews, scorecards and application notes."}{" "}
                            The candidate and their attachments are kept.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteError && (
                        <p className="text-xs text-red-600">{deleteError}</p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? "Deleting…" : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RowAction;
