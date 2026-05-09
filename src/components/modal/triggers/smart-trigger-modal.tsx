import {Dialog,DialogContent} from '@/components/ui/dialog';
import React from 'react';
import { TriggerAction } from '@/plugins/smart-trigger/types';
import SmartLocationTriggerForm from './smart-location-trigger-form';
import SmartExperienceTriggerForm from './smart-experience-trigger-form';
import SmartEmailTriggerForm from './smart-email-trigger-form';
import SmartNoteTriggerForm from './smart-note-trigger-form';

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
            <DialogContent className="">
                {triggerType == "location" && <SmartLocationTriggerForm onSubmit={onSubmit} />}
                {triggerType == "experience" && <SmartExperienceTriggerForm onSubmit={onSubmit} />}
                {triggerType == "email" && <SmartEmailTriggerForm onSubmit={onSubmit} />}
                {triggerType == "note" && <SmartNoteTriggerForm onSubmit={onSubmit} />}
            </DialogContent>
        </Dialog>
    )
};

export default SmartTriggerModal;
