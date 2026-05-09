import { useTransition } from 'react';
import { locationTriggerSchema } from '@/zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { JOB_STAGES } from '@/zod';
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { z } from "zod";
import { Form, FormField, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CITIES } from "@/lib/constant";
import { ArrowRight } from 'lucide-react';
import SmartTriggerLayout from '@/components/smart-trigger/smart-trigger-layout';
import SmartTriggerDelayForm from '@/components/smart-trigger/smart-trigger-delay-form';

const SmartLocationTriggerForm = ({ onSubmit }: { onSubmit: (data: TriggerAction) => void }) => {
    const [isPending, startTransition] = useTransition();
    const form = useForm<z.infer<typeof locationTriggerSchema>>({
        resolver: zodResolver(locationTriggerSchema),
        defaultValues: {
            location: "",
            stage: JOB_STAGES.options[0],
            delay: 1,
            delayFormat: 'minutes',
        },
    });

    const handleSubmit = async (data: z.infer<typeof locationTriggerSchema>) => {
        startTransition(async () => {
            onSubmit({
                id: Date.now(),
                action_type: "MOVE",
                config: {
                    condition: {
                        type: "location",
                        target: data.stage,
                        location: data.location
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
            title="Smart Location Trigger"
            description="Automatically move candidates to another stage based on their location"
            isPending={isPending}
        >
            <Form {...form}>
                <form id="form" onSubmit={form.handleSubmit(handleSubmit)}>
                    <div className='border rounded-xl bg-card p-6 mt-4'>
                        <div className="space-y-8">
                            <div>
                                <FormLabel className="text-base font-medium mb-3 block">
                                    Trigger Condition
                                </FormLabel>
                                <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border">
                                    <div className="text-sm font-medium text-muted-foreground w-28">If candidate located in</div>
                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <div className='flex-1 gap-2'>
                                                <Select name="location" onValueChange={field.onChange}
                                                    defaultValue={field.value}>
                                                    <SelectTrigger className="">
                                                        <SelectValue placeholder="Select a stage name" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {CITIES.map(city => (
                                                            <SelectItem key={city} value={city}>{city}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    />
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
                                            <div className='flex-1 gap-2'>
                                                <Select name="stage" onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger className="">
                                                        <SelectValue placeholder="Select a stage name" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {JOB_STAGES.options.map(stage => (
                                                            <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
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

export default SmartLocationTriggerForm;
