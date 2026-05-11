import SmartTriggerDelayForm from "@/components/smart-trigger/smart-trigger-delay-form";
import SmartTriggerLayout from "@/components/smart-trigger/smart-trigger-layout";
import { Form, FormField, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { ArrowRight, Notebook } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

const SmartNoteTriggerForm = ({ onSubmit }: { onSubmit: (data: TriggerAction) => void }) => {
    const [isPending, startTransition] = useTransition();

    const form = useForm({
        defaultValues: {
            target: "",
            notes: "",
            delay: 0,
            delayFormat: "minutes",
        },
    });

    const handleSubmit = (data) => {
        startTransition(() => {
            onSubmit({
                id: Date.now(),
                action_type: "NOTE",
                config: {
                    condition: {
                        type: "note",
                        target: "Applied",
                    },
                    note: {
                        content: data.notes,
                        adddress_to: data.target,
                    },
                    delay: data.delay,
                    delayFormat: data.delayFormat,
                },
            });
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
                                    <div className="text-sm font-medium text-muted-foreground w-28">@</div>
                                    <FormField
                                        control={form.control}
                                        name="target"
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
                                        Write this note
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <Textarea
                                                placeholder="Enter note content"
                                                className="flex-1"
                                                {...field}
                                            />
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
