import {z} from "zod";
import React, {useState, useTransition} from "react";
import {Input} from "@/components/ui/input";
import {useForm} from "react-hook-form";
import {Button} from "@/components/ui/button";
import {zodResolver} from "@hookform/resolvers/zod";
import {TriggerAction} from "@/plugins/smart-trigger/types";
import {Form, FormField, FormLabel} from '@/components/ui/form';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";

type Props = {
    isModalOpen: boolean;
    closeModal: () => void;
    onSubmit: (data: TriggerAction) => void;
};

const SmartEmailSchema = z.object({
    email: z.string(),
    template: z.string(),
    delay: z.number(),
    delayFormat: z.enum(['minutes', 'hours', 'days'], {message: 'Select a delay unit'})
});

const SmartEmailTriggerModal = ({isModalOpen, closeModal, onSubmit}: Props) => {
    const [templates, setTemplates] = useState<EmailTemplate[]>(emailTemplates);
    const [isPending, startTransition] = useTransition();
    const form = useForm<z.infer<typeof SmartEmailSchema>>({
        resolver: zodResolver(SmartEmailSchema),
        defaultValues: {
            email: '',
            template: '',
            delay: 0,
            delayFormat: "minutes",
        },
    });

    const handleSubmit = (data: z.infer<typeof SmartEmailSchema>) => {
        startTransition(async () => {
            onSubmit({
                action_type: "email",
                config: {
                    condition: {
                        type: "email",
                        target: data.email,
                        template: data.template,
                    },
                    delay: data.delay,
                    delayFormat: data.delayFormat,
                },
            });
        });
    };

    return (
        <Dialog
            open={isModalOpen}
            onOpenChange={(isOpen) => !isOpen && closeModal()}
        >
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Smart Trigger</DialogTitle>
                    <DialogDescription>
                        Configure the smart trigger
                    </DialogDescription>
                </DialogHeader>

                <div className='border p-4 bg-muted rounded-md'>
                    <div className="flex flex-col">
                        <span>Smart Email</span>
                        <span className='text-sm text-muted-foreground'>Add Trigger based on candidates Email</span>
                    </div>

                    <Form {...form}>
                        <form id="form" onSubmit={form.handleSubmit(handleSubmit)}>
                            <div className="flex gap-4 mt-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({field}) => (
                                        <div className='flex-1 gap-2'>
                                            <FormLabel>if candidate has email</FormLabel>
                                            <Input type="text" {...field}/>
                                        </div>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="template"
                                    render={({field}) => (
                                        <div className='flex-1 gap-2'>
                                            <FormLabel>Send Email</FormLabel>
                                            <Select name="template" onValueChange={field.onChange}
                                                    defaultValue={field.value}>
                                                <SelectTrigger className="">
                                                    <SelectValue placeholder="Select a template"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {templates.map((template) => (
                                                        <Tooltip key={template.id} delayDuration={1000}>
                                                            <TooltipTrigger asChild>
                                                                <SelectItem value={template.id}>
                                                                    {template.name}
                                                                </SelectItem>
                                                            </TooltipTrigger>

                                                            <TooltipContent
                                                                className="bg-white border rounded-md p-4 max-w-xs shadow-lg"
                                                                sideOffset={5}
                                                            >
                                                                <h3 className="font-bold">{template.name}</h3>
                                                                <p className="text-sm text-gray-600">
                                                                    Subject: {template.subject}
                                                                </p>
                                                                <p className="text-sm text-gray-600">
                                                                    {template.previewText}
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
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
                    <Button disabled={isPending} type="submit" form="form">Add Trigger</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export type EmailTemplate = {
    id: string;
    name: string;
    subject: string;
    content: string; // HTML or plain text content
    previewText: string; // Short text for hover preview
};

export const emailTemplates: EmailTemplate[] = [
    {
        id: "template1",
        name: "Welcome Email",
        subject: "Welcome to Our Platform!",
        content: "<h1>Welcome!</h1><p>Thank you for joining us...</p>",
        previewText: "A warm welcome email for new users.",
    },
    {
        id: "template2",
        name: "Follow-Up Email",
        subject: "Let's Catch Up",
        content: "<h1>Follow Up</h1><p>We noticed you haven't completed...</p>",
        previewText: "A follow-up email to re-engage users.",
    },
    {
        id: "template3",
        name: "Reminder Email",
        subject: "Don't Forget!",
        content: "<h1>Reminder</h1><p>Your subscription is about to expire...</p>",
        previewText: "A reminder for upcoming deadlines.",
    },
];

export default SmartEmailTriggerModal;
