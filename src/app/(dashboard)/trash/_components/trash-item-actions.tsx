"use client";

import React, { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    empty_trash_action,
    permanent_delete_trash_item_action,
    restore_trash_item_action,
} from "@/server/actions/trash-actions";
import type { TrashItemType } from "@/server/queries/drizzle/trash";

/** Tell the Trash sidebar (and any other listener) to refetch its counts. */
const notifyTrashChanged = () => {
    window.dispatchEvent(new Event("trash:changed"));
};

const CASCADE_COPY: Record<TrashItemType, string> = {
    job: "Its applications (and their interviews and scorecards) are permanently deleted with it. Candidates are kept.",
    candidate: "Their applications (and their interviews and scorecards), attachments, internal notes and stored details are permanently deleted with them.",
    application: "Its interviews, scorecards and application notes are permanently deleted with it. The candidate is kept.",
};

type TrashItemActionsProps = {
    type: TrashItemType;
    id: number;
    title: string;
    /** Same people who can delete can restore — both need the :delete permission. */
    canManage: boolean;
};

/** Per-item Restore + Delete forever buttons for one trash row. */
export const TrashItemActions = ({ type, id, title, canManage }: TrashItemActionsProps) => {
    const router = useRouter();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!canManage) return null;

    const handleRestore = async () => {
        setError(null);
        setIsWorking(true);
        const result = await restore_trash_item_action({ type, id });
        setIsWorking(false);
        if (result && "error" in result) {
            setError(result.message ?? "Failed to restore the item");
            return;
        }
        notifyTrashChanged();
        router.refresh();
    };

    const handleDeleteForever = async () => {
        setError(null);
        setIsWorking(true);
        const result = await permanent_delete_trash_item_action({ type, id });
        setIsWorking(false);
        setIsConfirmOpen(false);
        if (result && "error" in result) {
            setError(result.message ?? "Failed to permanently delete the item");
            return;
        }
        notifyTrashChanged();
        router.refresh();
    };

    return (
        <div className="flex items-center gap-2">
            {error && <span className="text-xs text-red-600 max-w-56">{error}</span>}
            <Button variant="outline" size="sm" onClick={handleRestore} disabled={isWorking}>
                <RotateCcw size={14} className="mr-1" />
                {isWorking ? "Restoring…" : "Restore"}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setIsConfirmOpen(true)} disabled={isWorking}>
                <Trash2 size={14} className="mr-1" />
                Delete forever
            </Button>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete forever?</DialogTitle>
                        <DialogDescription>
                            &quot;{title}&quot; will be permanently deleted. {CASCADE_COPY[type]}{" "}
                            This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isWorking}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteForever} disabled={isWorking}>
                            {isWorking ? "Deleting…" : "Delete forever"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

/** Empty Trash button for the page header. Only rendered when there is
 * something to delete and the caller may permanently delete at least one
 * type (the server action enforces that per type and reports what stayed). */
export const EmptyTrashButton = ({ disabled }: { disabled?: boolean }) => {
    const router = useRouter();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmpty = async () => {
        setError(null);
        setIsWorking(true);
        const result = await empty_trash_action();
        setIsWorking(false);
        setIsConfirmOpen(false);
        if (result && "error" in result) {
            setError(result.message ?? "Failed to empty Trash");
            return;
        }
        notifyTrashChanged();
        router.refresh();
    };

    return (
        <>
            {error && <span className="text-xs text-red-600">{error}</span>}
            <Button variant="destructive" onClick={() => setIsConfirmOpen(true)} disabled={disabled || isWorking}>
                <Trash2 size={16} className="mr-2" />
                {isWorking ? "Emptying…" : "Empty Trash"}
            </Button>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Empty Trash?</DialogTitle>
                        <DialogDescription>
                            Every item in Trash that you have permission to delete will be
                            permanently deleted. Items you cannot delete stay in Trash. This
                            cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isWorking}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleEmpty} disabled={isWorking}>
                            {isWorking ? "Emptying…" : "Empty Trash"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
