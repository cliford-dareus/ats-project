import React, { useState } from "react";
import { DeleteIcon, EditIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditJobListingModal from "@/components/modal/edit-joblisting-modal";
import DeleteJoblistingModal from "@/components/modal/delete-joblisting-modal";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const RowAction = ({ row, table }) => {
  const meta = table.options.meta;
  const validRow = meta?.validRows[row.id];
  const disableSubmit = validRow
    ? Object.values(validRow)?.some((value) => !value)
    : false;
  const [isEditJobOpen, setIsEditJobOpen] = useState(false);
  const [isDeleteJobOpen, setIsDeleteJobOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button disabled={disableSubmit} variant="ghost" onClick={() => setIsEditJobOpen(true)}>
          <EditIcon size={18} />
        </Button>
        <Button disabled={disableSubmit} variant="ghost" onClick={() => setIsDeleteJobOpen(true)}>
          <DeleteIcon size={18} />
        </Button>
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
