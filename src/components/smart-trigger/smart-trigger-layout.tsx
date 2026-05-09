import { Button } from "../ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

type SmartTriggerLayoutProps = {
    children: React.ReactNode;
    SubmitLabel: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    isPending: boolean;
};

const SmartTriggerLayout = ({ children, SubmitLabel, icon, title, description, isPending }: SmartTriggerLayoutProps) => {
    return (
        <div className="space-y-6">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <span className="">{icon}</span>
                    <span className="">{title}</span>
                </DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                {children}
            </div>

            <div className='flex justify-end mt-4 gap-4 border-t pt-4'>
                <Button disabled={isPending} type="submit" form="form">{SubmitLabel}</Button>
            </div>
        </div>
    );
};

export default SmartTriggerLayout;
