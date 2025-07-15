import React from "react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {Input} from "@/components/ui/input";
import {TriggerAction} from "@/plugins/smart-trigger/types";

type Props = {
    isModalOpen: boolean;
    closeModal: () => void;
    onSubmit: (data: TriggerAction) => void;
};

const SmartEmailTriggerModal = ({isModalOpen, closeModal, onSubmit}: Props) => {
  return (
    <Dialog
        open={isModalOpen}
        onOpenChange={(isOpen) => !isOpen && closeModal()}
    >
        <DialogContent className="max-w-xl">
            <DialogHeader>
                <DialogTitle>Smart Trigger</DialogTitle>
                <DialogDescription>
                    Configure the smart trigger
                </DialogDescription>
            </DialogHeader>

            <div className='border p-4 bg-muted rounded-md mt-4'>
                <div className="flex flex-col">
                    <span>Smart Email</span>
                    <span className='text-sm text-muted-foreground'>Add Trigger based on candidates Email</span>
                </div>
            </div>
        </DialogContent>
    </Dialog>
  );
};

export default SmartEmailTriggerModal;
