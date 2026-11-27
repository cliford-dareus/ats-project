import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Command, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { delete_job_action } from "@/server/actions/job-listings-actions";

type DeleteJobModalProps = {
  isDeleteJobOpen: boolean;
  setIsDeleteJobOpen: React.Dispatch<React.SetStateAction<boolean>>;
  data: any;
};

const DeleteJobListingModal = ({
  isDeleteJobOpen,
  setIsDeleteJobOpen,
  data,
}: DeleteJobModalProps) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The confirm button used to only close the dialog (onDelete was commented
  // out), so single-row delete from the jobs list did nothing. It now calls
  // the same soft-delete action the bulk bar uses.
  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    const result = await delete_job_action(data.id);
    if (result && "error" in result) {
      setError(result.message ?? "There was an error deleting the job");
      setIsDeleting(false);
      return;
    }
    setIsDeleting(false);
    setIsDeleteJobOpen(false);
    router.refresh();
  };
  return (
    <Dialog open={isDeleteJobOpen} onOpenChange={setIsDeleteJobOpen}>
      <DialogContent>
        <DialogHeader className="flex flex-row gap-4 items-center">
          <div className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Command />
          </div>
          <div className="">
            <DialogTitle className="text-2xl uppercase">Delete Job</DialogTitle>
            <DialogDescription>
              This moves the job to Trash. You can restore it from Trash, or delete it forever there.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <p className="text-zinc-600 leading-relaxed">
              Are you sure you want to delete the job opening for{" "}
              <span className="font-bold text-zinc-900">&quot;{data.name}&quot;</span>?
            </p>
            <p className="text-sm text-zinc-500 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              The job and its applications will be moved to Trash. Restoring
              the job brings them back; deleting forever from Trash removes
              them permanently.
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              disabled={isDeleting}
              onClick={() => setIsDeleteJobOpen(false)}
              className="flex-1 py-3 border border-zinc-200 text-zinc-700 rounded-xl font-bold hover:bg-zinc-50 transition-all"
            >
              Cancel
            </Button>
            <Button
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting…" : "Delete Job"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteJobListingModal;
