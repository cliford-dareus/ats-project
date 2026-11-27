import React, { useState } from "react";
import { DeleteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CandidatesResponseType } from "@/types";
import { useHasPermission } from "@/lib/use-permission";
import { delete_candidate_action } from "@/server/actions/candidates-actions";
import DeleteCandidateModal from "@/components/modal/delete-candidate-modal";
import { useRouter } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const RowAction = ({ row, table }) => {
    const hasPermission = useHasPermission();
    // No Edit button: there is no candidate-edit form/modal to reuse, so
    // the old Edit button only ever opened state that rendered nothing.
    const canDelete = hasPermission("candidate:delete");
    const candidate = row.original as CandidatesResponseType;
    const meta = table.options.meta;
    const validRow = meta?.validRows[row.id];
    const disableSubmit = validRow
        ? Object.values(validRow)?.some((value) => !value)
        : false;
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const router = useRouter();

    const handleDelete = async () => {
        setIsDeleting(true);
        setDeleteError(null);
        const result = await delete_candidate_action(candidate.id);
        setIsDeleting(false);
        if (result && "error" in result) {
            setDeleteError(result.message ?? "There was an error deleting the candidate");
            return;
        }
        setIsDeleteOpen(false);
        router.refresh();
    };

    return (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {canDelete && (
                <Button
                    disabled={disableSubmit || isDeleting}
                    variant="ghost"
                    onClick={() => setIsDeleteOpen(true)}
                >
                    <DeleteIcon size={18} />
                </Button>
            )}
            {deleteError && (
                <span className="text-xs text-red-600">{deleteError}</span>
            )}
            <DeleteCandidateModal
                isOpen={isDeleteOpen}
                setIsOpen={setIsDeleteOpen}
                candidates={[candidate]}
                confirming={isDeleting}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default RowAction;
