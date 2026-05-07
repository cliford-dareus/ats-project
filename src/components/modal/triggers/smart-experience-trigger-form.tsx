import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormLabel } from '@/components/ui/form';
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JOB_STAGES } from "@/zod";
import { z } from "zod";
import { experienceTriggerSchema } from "@/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTransition } from "react";
import { TriggerAction } from "@/plugins/smart-trigger/types";

const SmartExperienceTriggerForm = ({ onSubmit }: { onSubmit: (data: TriggerAction) => void }) => {
    const [isPendind, startTransition] = useTransition();
    const form = useForm<z.infer<typeof experienceTriggerSchema>>({
        resolver: zodResolver(experienceTriggerSchema),
        defaultValues: {
            experience: 0,
            stage: JOB_STAGES[0],
            delay: 0,
            delayFormat: "minutes",
        },
    });

    const handleSubmit = async (data: z.infer<typeof experienceTriggerSchema>) => {
        startTransition(async () => {
            onSubmit({
                id: 0,
                action_type: "move",
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
        <div>
            <DialogHeader>
                <DialogTitle>Smart Trigger</DialogTitle>
                <DialogDescription>
                    Configure the smart trigger
                </DialogDescription>
            </DialogHeader>

            <div className='border p-4 bg-muted rounded-md mt-4'>
                <div className="flex flex-col">
                    <span>Smart Move</span>
                    <span className='text-sm text-muted-foreground'>Add Trigger based on candidates Experience</span>
                </div>
                <Form {...form}>
                    <form id="form" onSubmit={form.handleSubmit(handleSubmit)}>
                        <div className="flex gap-4 mt-4">
                            <FormField
                                control={form.control}
                                name="experience"
                                render={({ field }) => (
                                    <div className='flex-1 gap-2'>
                                        <FormLabel>if candidate has more than</FormLabel>
                                        <Input type="number" {...field} />
                                    </div>
                                )}
                            />
                        </div>
                        <div className='flex-1 gap-2'>
                            <FormField
                                control={form.control}
                                name="stage"
                                render={({ field }) => (
                                    <div className='flex-1 gap-2'>
                                        <FormLabel>Move candidate to</FormLabel>
                                        <Select name="stage" onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger className="">
                                                <SelectValue placeholder="Select a stage name" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {JOB_STAGES.map(stage => (
                                                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            />
                        </div>

                        <div className='flex items-center gap-2 mt-4'>
                            <FormLabel>Delay Trigger for</FormLabel>
                            <div className='flex gap-2'>
                                <FormField
                                    control={form.control}
                                    name="delay"
                                    render={({ field }) => (
                                        <div className='w-[100px]'>
                                            <Input type="number" {...field} min={1} />
                                        </div>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="delayFormat"
                                    render={({ field }) => (
                                        <div className='flex gap-2 text-sm'>
                                            {["minutes", "hours", "days"].map((unit) => (
                                                <Button
                                                    key={unit}
                                                    variant={field.value === unit ? 'default' : 'outline'}
                                                    onClick={() => field.onChange(unit)}
                                                >
                                                    {unit}
                                                </Button>
                                            ))}
                                        </div>)}
                                />
                            </div>
                        </div>
                    </form>
                </Form>
            </div>
            <div className='flex justify-end mt-4'>
                <Button disabled={isPendind} type="submit" form="form">Add Trigger</Button>
            </div>
        </div>
    );
};

export default SmartExperienceTriggerForm;
