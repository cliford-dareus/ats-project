import {Command} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import React from "react";

type EditJobModalProps = {
    isOpen: boolean;
    setIsOpen:  React.Dispatch<React.SetStateAction<boolean>>;
};

const EditJobListingModal = ({isOpen, setIsOpen}: EditJobModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="absolute">
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div
                        className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Command/>
                    </div>
                    <div className="">
                        <DialogTitle className="text-2xl uppercase">Edit Job</DialogTitle>
                        <DialogDescription>Complete each step to create a candidate!</DialogDescription>
                    </div>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
};

export default EditJobListingModal;