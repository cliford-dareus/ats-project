import React, { useState } from "react";
import { DeleteIcon, EditIcon, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditJobListingModal from "@/components/modal/edit-joblisting-modal";
import DeleteJoblistingModal from "@/components/modal/delete-joblisting-modal";
import { useHasPermission } from "@/lib/use-permission";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const RowAction = ({ row, table }) => {
    const hasPermission = useHasPermission();
    const canEdit = hasPermission("job:edit");
    const canDelete = hasPermission("job:delete");
    const canCreate = hasPermission("job:create");
    const meta = table.options.meta;
    const validRow = meta?.validRows[row.id];
    const disableSubmit = validRow
        ? Object.values(validRow)?.some((value) => !value)
        : false;
    const [isEditJobOpen, setIsEditJobOpen] = useState(false);
    const [isDeleteJobOpen, setIsDeleteJobOpen] = useState(false);
    const isDraft = row.original?.status === "DRAFT";

    return (
        <>
            <div className="flex items-center gap-2">
                {isDraft && canCreate && (
                    <Link href={`/jobs/new/step-one?draft=${row.original.id}`} title="Resume Draft">
                        <Button variant="ghost" size="icon">
                            <Play size={18} />
                        </Button>
                    </Link>
                )}
                {canEdit && (
                    <Button disabled={disableSubmit} variant="ghost" onClick={() => setIsEditJobOpen(true)}>
                        <EditIcon size={18} />
                    </Button>
                )}
                {canDelete && (
                    <Button disabled={disableSubmit} variant="ghost" onClick={() => setIsDeleteJobOpen(true)}>
                        <DeleteIcon size={18} />
                    </Button>
                )}
            </div>

            <EditJobListingModal
                isEditJobOpen={isEditJobOpen}
                setIsEditJobOpen={setIsEditJobOpen}
                data={row.original}
            />
            <DeleteJoblistingModal
                isDeleteJobOpen={isDeleteJobOpen}
                setIsDeleteJobOpen={setIsDeleteJobOpen}
                data={row.original}
            />
        </>
    );
};

export default RowAction;
