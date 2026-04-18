import {Dialog,DialogContent} from '@/components/ui/dialog';
import React from 'react';
import { TriggerAction } from '@/lib/smart-trigger/types';
import SmartLocationTriggerForm from './smart-location-trigger-form';
import SmartExperienceTriggerForm from './smart-experience-trigger-form';
import SmartEmailTriggerForm from './smart-email-trigger-form';

type Props = {
    isModalOpen: boolean;
    closeModal: () => void;
    triggerType: string;
    onSubmit: (data: TriggerAction) => void;
};

const SmartTriggerModal = ({ isModalOpen, closeModal, triggerType, onSubmit }: Props) => {
    return (
        <Dialog
            open={isModalOpen}
            onOpenChange={(isOpen) => !isOpen && closeModal()}
        >
            <DialogContent className="max-w-xl">
                {triggerType == "location" && <SmartLocationTriggerForm onSubmit={onSubmit} />}
                {triggerType == "experience" && <SmartExperienceTriggerForm onSubmit={onSubmit} />}
                {triggerType == "email" && <SmartEmailTriggerForm onSubmit={onSubmit} />}
            </DialogContent>
        </Dialog>
    )
};

export default SmartTriggerModal;
