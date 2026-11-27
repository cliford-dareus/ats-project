import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { CandidatesResponseType } from "@/types";

type DeleteCandidateModalProps = {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    candidates: CandidatesResponseType[];
    confirming: boolean;
    onConfirm: () => void;
};

/**
 * Confirm deleting one or more candidates. The copy states the cascade
 * explicitly: deleting a candidate also deletes their applications (and
 * the interviews/scorecards under them), their attachments, their
 * internal notes and their stored candidate details. R2 files behind
 * attachments are not removed.
 */
const DeleteCandidateModal = ({
    isOpen,
    setIsOpen,
    candidates,
    confirming,
    onConfirm,
}: DeleteCandidateModalProps) => {
    const totalApplications = candidates.reduce((sum, c) => sum + (c.applicationsCount ?? 0), 0);
    const totalAttachments = candidates.reduce((sum, c) => sum + (c.attachmentsCount ?? 0), 0);
    const names = candidates.map((c) => c.name).join(", ");
    const isBulk = candidates.length > 1;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-red-600 text-white">
                        <Trash2 />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl uppercase">
                            Delete {isBulk ? `${candidates.length} Candidates` : "Candidate"}
                        </DialogTitle>
                        <DialogDescription>
                            This action cannot be undone.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="space-y-3">
                        <p className="text-zinc-600 leading-relaxed">
                            Are you sure you want to delete{" "}
                            <span className="font-bold text-zinc-900">
                                &quot;{names}&quot;
                            </span>
                            ?
                        </p>
                        <p className="text-sm text-zinc-500 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                            This also permanently deletes{" "}
                            {totalApplications} application{totalApplications === 1 ? "" : "s"}
                            {" "}(including their interviews and scorecards),{" "}
                            {totalAttachments} attachment{totalAttachments === 1 ? "" : "s"}, and
                            the candidate&apos;s internal notes and stored details.
                            Files already uploaded to storage are not removed.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            disabled={confirming}
                            className="flex-1 py-3 border border-zinc-200 text-zinc-700 rounded-xl font-bold hover:bg-zinc-50 transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={confirming}
                            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            {confirming ? "Deleting…" : `Delete ${isBulk ? `${candidates.length} Candidates` : "Candidate"}`}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteCandidateModal;
