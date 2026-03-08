import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {JOB_STAGES} from '@/zod';
import {DialogTitle} from '@radix-ui/react-dialog';
import React, {useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {Form, FormField, FormLabel} from '@/components/ui/form';
import {Button} from '@/components/ui/button';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Input} from '@/components/ui/input';
import {Plus} from 'lucide-react';
import {TriggerAction} from '@/lib/smart-trigger/types';
import {CITIES} from "@/lib/utils";

type Props = {
    isModalOpen: boolean;
    closeModal: () => void;
    triggerType: string;
    onSubmit: (data: TriggerAction) => void;
};

const locationSchema = z.object({
    location: z.string().min(1, 'Location is required'),
    stage: z.enum(JOB_STAGES, {message: 'Please select a valid stage'}),
    delay: z.number().min(1, 'Delay must be at least 1'),
    delayFormat: z.enum(['minutes', 'hours', 'days'], {message: 'Select a delay unit'}),
});

const experienceSchema = z.object({
    experience: z.number(),
    stage: z.enum(JOB_STAGES),
    delay: z.number().min(1, 'Delay must be at least 1'),
    delayFormat: z.enum(['minutes', 'hours', 'days'], {message: 'Select a delay unit'}),
});

const SmartMoveTriggerModal = ({isModalOpen, closeModal, triggerType, onSubmit}: Props) => {
    return (
        <Dialog
            open={isModalOpen}
            onOpenChange={(isOpen) => !isOpen && closeModal()}
        >
            <DialogContent className="max-w-xl">
                {triggerType == "location" && <LocationComponent onSubmit={onSubmit}/>}
                {triggerType == "experience" && <ExperienceComponent onSubmit={onSubmit}/>}
            </DialogContent>
        </Dialog>
    )
};

const LocationComponent = ({onSubmit}: { onSubmit: (data: TriggerAction) => void }) => {
    const [isPendind, startTransition] = useTransition();
    const form = useForm<z.infer<typeof locationSchema>>({
        resolver: zodResolver(locationSchema),
        defaultValues: {
            location: "",
            stage: JOB_STAGES[0],
            delay: 1,
            delayFormat: 'minutes',
        },
    });

    const handleSubmit = async (data: z.infer<typeof locationSchema>) => {
        startTransition(async () => {
            onSubmit({
                action_type: "move",
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
                    <span className='text-sm text-muted-foreground'>Add Trigger based on candidates Location</span>
                </div>
                <Form {...form}>
                    <form id="form" onSubmit={form.handleSubmit(handleSubmit)}>
                        <div className="flex gap-4 mt-4">
                            <FormField
                                control={form.control}
                                name="location"
                                render={({field}) => (
                                    <div className='flex-1 gap-2'>
                                        <FormLabel>if candidate is in</FormLabel>
                                        <Select name="location" onValueChange={field.onChange}
                                                defaultValue={field.value}>
                                            <SelectTrigger className="">
                                                <SelectValue placeholder="Select a stage name"/>
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
                            <FormField
                                control={form.control}
                                name="stage"
                                render={({field}) => (
                                    <div className='flex-1 gap-2'>
                                        <FormLabel>Move candidate to</FormLabel>
                                        <Select name="stage" onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger className="">
                                                <SelectValue placeholder="Select a stage name"/>
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
                                    render={({field}) => (
                                        <div className='w-[100px]'>
                                            <Input type="number" {...field} min={1}/>
                                        </div>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="delayFormat"
                                    render={({field}) => (
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

            <div className='text-sm flex items-center gap-2 mt-4'>
                <span>Add another condition</span>
                <Button className='ml-2' variant="ghost">
                    <Plus size={18}/>
                </Button>
            </div>

            <div className='flex justify-end mt-4'>
                <Button disabled={isPendind} type="submit" form="form">Add Trigger</Button>
            </div>
        </div>
    );
};

const ExperienceComponent = ({onSubmit}: { onSubmit: (data: TriggerAction) => void }) => {
    const [isPendind, startTransition] = useTransition();
    const form = useForm<z.infer<typeof experienceSchema>>({
        resolver: zodResolver(experienceSchema),
        defaultValues: {
            experience: 0,
            stage: JOB_STAGES[0],
            delay: 0,
            delayFormat: "minutes",
        },
    });

    const handleSubmit = async (data: z.infer<typeof experienceSchema>) => {
        startTransition(async () => {
            onSubmit({
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
                                render={({field}) => (
                                    <div className='flex-1 gap-2'>
                                        <FormLabel>if candidate has more than</FormLabel>
                                        <Input type="number" {...field}/>
                                    </div>
                                )}
                            />
                        </div>
                        <div className='flex-1 gap-2'>
                            <FormField
                                control={form.control}
                                name="stage"
                                render={({field}) => (
                                    <div className='flex-1 gap-2'>
                                        <FormLabel>Move candidate to</FormLabel>
                                        <Select name="stage" onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger className="">
                                                <SelectValue placeholder="Select a stage name"/>
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
                                    render={({field}) => (
                                        <div className='w-[100px]'>
                                            <Input type="number" {...field} min={1}/>
                                        </div>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="delayFormat"
                                    render={({field}) => (
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
                <Button disabled={isPendind}  type="submit" form="form">Add Trigger</Button>
            </div>
        </div>
    );
};

export default SmartMoveTriggerModal;
