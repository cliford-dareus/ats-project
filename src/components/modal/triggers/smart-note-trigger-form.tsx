import SmartTriggerDelayForm from "@/components/smart-trigger/smart-trigger-delay-form";
import SmartTriggerLayout from "@/components/smart-trigger/smart-trigger-layout";
import { Form, FormField, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { JOB_STAGES } from "@/zod";
import { ArrowRight, Notebook } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

const SmartNoteTriggerForm = ({ onSubmit }: { onSubmit: (data: TriggerAction) => void }) => {
    const [isPending, startTransition] = useTransition();

    const form = useForm({
        defaultValues: {
            experience: 0,
            stage: JOB_STAGES.options[0],
            delay: 0,
            delayFormat: "minutes",
        },
    });

    const handleSubmit = (data) => {
        startTransition(() => {
            onSubmit(data);
        });
    };

    return (
        <SmartTriggerLayout
            SubmitLabel="Submit"
            icon={<Notebook />}
            title="Smart Note Trigger"
            description="Create a smart note trigger based on your notes."
            isPending={isPending}
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <div className='border rounded-xl bg-card p-6 mt-4'>
                        <div className="space-y-8">
                              {/* Condition Row */}
                            <div>
                                <FormLabel className="text-base font-medium mb-3 block">
                                    Trigger Condition
                                </FormLabel>
                                <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border">
                                    <div className="text-sm font-medium text-muted-foreground w-28">If candidate has</div>
                                    <FormField                                       
                                        control={form.control}
                                        name="experience"
                                        render={({ field }) => (
                                            <Input
                                                type="number"
                                                className="w-32 text-center"
                                                min={0}
                                                {...field}
                                            />
                                        )}
                                    />
                                    <div className="text-sm text-muted-foreground">years of experience</div>
                                </div>
                            </div>

                            {/* Action Row */}
                            <div>
                                <FormLabel className="text-base font-medium mb-3 block">
                                    Action
                                </FormLabel>
                                <div className="flex items-center gap-3 bg-muted/50 p-4 rounded-lg border">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-28">
                                        Move to <ArrowRight className="w-4 h-4" />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="stage"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Select destination stage" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {JOB_STAGES.options.map((stage) => (
                                                        <SelectItem key={stage} value={stage}>
                                                            {stage}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>
                            
                            <SmartTriggerDelayForm form={form} />
                        </div>
                    </div>
                </form>
            </Form>
        </SmartTriggerLayout>
    );
};

export default SmartNoteTriggerForm;
