import { Input } from "@/components/ui/input";
import { Form, FormField, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JOB_STAGES } from "@/zod";
import { z } from "zod";
import { experienceTriggerSchema } from "@/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTransition } from "react";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { ArrowRight } from "lucide-react";
import SmartTriggerDelayForm from "@/components/smart-trigger/smart-trigger-delay-form";
import SmartTriggerLayout from "@/components/smart-trigger/smart-trigger-layout";

const SmartExperienceTriggerForm = ({ onSubmit }: { onSubmit: (data: TriggerAction) => void }) => {
    const [isPending, startTransition] = useTransition();
    const form = useForm<z.infer<typeof experienceTriggerSchema>>({
        resolver: zodResolver(experienceTriggerSchema),
        defaultValues: {
            experience: 0,
            stage: JOB_STAGES.options[0],
            delay: 0,
            delayFormat: "minutes",
        },
    });

    const handleSubmit = async (data: z.infer<typeof experienceTriggerSchema>) => {
        startTransition(async () => {
            onSubmit({
                id: 0,
                action_type: "MOVE",
                config: {
                    condition: {
                        type: "experience",
                        operator: "gt",
                        experience: data.experience,
                        target: data.stage,
                    },
                    delay: data.delay,
                    delayFormat: data.delayFormat,
                },
            });
        });
    };

    return (
        <SmartTriggerLayout
            SubmitLabel="Add Trigger"
            icon={<ArrowRight />}
            title="Smart Move Trigger"
            description="Automatically move candidates to another stage based on experience"
            isPending={isPending}
        >
            <Form {...form}>
                <form id="form" onSubmit={form.handleSubmit(handleSubmit)} className="">
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

                            {/* Delay Row */}
                            <SmartTriggerDelayForm form={form} />
                        </div>
                    </div>
                </form>
            </Form>
        </SmartTriggerLayout>
    );
};

export default SmartExperienceTriggerForm;
