import { Command } from "../ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

const SendEmailModal = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) => {
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                 <DialogHeader className="flex flex-row gap-4 items-center">
                    <div className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Command />
                    </div>
                    <div className="">
                        <DialogTitle className="text-2xl uppercase">Edit Job</DialogTitle>
                        <DialogDescription>
                            Complete each step to create a candidate!
                        </DialogDescription>
                    </div>
                </DialogHeader>
                
            </DialogContent>
        </Dialog>
    );
};

export default SendEmailModal;