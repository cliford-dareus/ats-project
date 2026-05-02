import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Command, Trash2} from "lucide-react";
import React from "react";
import {Button} from "@/components/ui/button";

type DeleteJobModalProps = {
    isDeleteJobOpen: boolean;
    setIsDeleteJobOpen:  React.Dispatch<React.SetStateAction<boolean>>;
    data: any
};

const DeleteJobListingModal = ({isDeleteJobOpen, setIsDeleteJobOpen, data}:DeleteJobModalProps) => {
    return (
        <Dialog open={isDeleteJobOpen} onOpenChange={setIsDeleteJobOpen}>
            <DialogContent>
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div
                        className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Command/>
                    </div>
                    <div className="">
                        <DialogTitle className="text-2xl uppercase">Delete Job</DialogTitle>
                        <DialogDescription>Complete each step to create a candidate!</DialogDescription>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="space-y-3">
                        <p className="text-zinc-600 leading-relaxed">
                            Are you sure you want to delete the job opening for <span className="font-bold text-zinc-900">"{data.name}"</span>?
                        </p>
                        <p className="text-sm text-zinc-500 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                            This action cannot be undone. All applicant data associated with this job will be archived.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setIsDeleteJobOpen(false)}
                            className="flex-1 py-3 border border-zinc-200 text-zinc-700 rounded-xl font-bold hover:bg-zinc-50 transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                // onDelete(job.id);
                                setIsDeleteJobOpen(false);
                            }}
                            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Job
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
};

export default DeleteJobListingModal;