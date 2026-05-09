import { z } from "zod";
import React, { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { Form, FormField, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartEmailTriggerSchema } from "@/zod";
import { EMAIL_TEMPLATES } from "@/lib/templates";
import { Textarea } from "@/components/ui/textarea";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getEmailTemplates, saveEmailTemplate } from "@/server/queries/mongo/email-templates";

type EmailTemplate = {
    id: string;
    name: string;
    subject: string;
    body: string;
};

type Props = {
    onSubmit: (data: TriggerAction) => void;
};

const SmartEmailTriggerForm = ({ onSubmit }: Props) => {
    const [savedTemplates, setSavedTemplates] = useState<EmailTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | undefined>(undefined);
    const [isPending, startTransition] = useTransition();
    const [showSaveAs, setShowSaveAs] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");

    const form = useForm<z.infer<typeof SmartEmailTriggerSchema>>({
        resolver: zodResolver(SmartEmailTriggerSchema),
        defaultValues: {
            subject: '',
            template: selectedTemplate?.id ?? '',
            body: '',
            delay: 0,
            delayFormat: "minutes",
        },
    });

    useEffect(() => {
        const fetchTemplates = async () => {
            const templates = await getEmailTemplates();
            setSavedTemplates(templates);
        };
        fetchTemplates();
    }, []);

    const handleTemplateChange = (value: string) => {
        // Check saved templates first
        let template = savedTemplates.find(t => t.id === value);

        // Fallback to static templates
        if (!template) {
            const temp = EMAIL_TEMPLATES.find(t => t.id === value);

            if (temp) template = {
                id: temp.id,
                name: temp.name,
                subject: temp.defaultProps.subject,
                body: temp.defaultProps.body,
            };
        }

        if (template) {
            setSelectedTemplate(template);
            form.setValue('template', value);
            form.setValue('subject', template.subject || '');
            form.setValue('body', template.body || '');
        }
    };

    const handleSaveAsTemplate = async () => {
        if (!newTemplateName.trim()) return alert("Please enter a template name");

        const values = form.getValues();

        const result = await saveEmailTemplate({
            name: newTemplateName.trim(),
            subject: values.subject,
            body: values.body,
        });

        if (result.success) {
            alert("Template saved successfully!");
            setShowSaveAs(false);
            setNewTemplateName("");

            // Refresh saved templates
            const updated = await getEmailTemplates();
            setSavedTemplates(updated);
        }
    };

    const handleSubmit = (data: z.infer<typeof SmartEmailTriggerSchema>) => {
        startTransition(async () => {
            onSubmit({
                id: 0,
                action_type: "EMAIL",
                config: {
                    email: {
                        subject: data.subject,
                        template: data.template,
                        body: data.body,
                    },
                    delay: data.delay,
                    delayFormat: data.delayFormat,
                },
            });
        });
    };

    const allTemplates = [
        ...EMAIL_TEMPLATES.map(t => ({ ...t, isSaved: false })),
        ...savedTemplates.map(t => ({ ...t, isSaved: true }))
    ];

    return (
        <div>
            <DialogHeader>
                <DialogTitle>Smart Trigger</DialogTitle>
                <DialogDescription>
                    Configure the smart trigger
                </DialogDescription>
            </DialogHeader>

            <div className='border p-4 bg-muted rounded-md'>
                <Form {...form}>
                    <form id="form" onSubmit={form.handleSubmit(handleSubmit)}>
                        <div className="flex gap-4 mt-4">
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <div className='flex-1 gap-2'>
                                        <FormLabel>Subject</FormLabel>
                                        <Input type="text" {...field} />
                                    </div>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="template"
                                render={({ field }) => (
                                    <div className='flex-1 gap-2'>
                                        <FormLabel>Template</FormLabel>
                                        <Select
                                            name="template"
                                            defaultValue={field.value}
                                            onValueChange={handleTemplateChange}
                                        >
                                            <SelectTrigger className="">
                                                <SelectValue placeholder="Select a template" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allTemplates.map((template) => (
                                                    <SelectItem key={template.id} value={template.id}>
                                                        {template.name} {template.isSaved && "(Saved)"}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            />
                        </div>

                        <div className=''>
                            <FormField
                                control={form.control}
                                name="body"
                                render={({ field }) => (
                                    <div className='w-full'>
                                        <FormLabel>Body <span className='text-zinc-400 text-[10px]'>(This will be used as the email body)</span></FormLabel>
                                        <Textarea {...field} />
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
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    </form>
                </Form>

                <div className="">
                    {selectedTemplate && <iframe
                        src={`/api/templates/preview?id=${selectedTemplate.id}`}
                        className="w-full h-[400px] bg-white"
                    />}
                </div>
            </div>

            {/* Save as Template Section */}
            <div className="pt-4 border-t">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSaveAs(!showSaveAs)}
                >
                    💾 Save as New Reusable Template
                </Button>

                {showSaveAs && (
                    <div className="mt-3 flex gap-2">
                        <Input
                            placeholder="Template Name (e.g. Final Interview Invite)"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                        />
                        <Button onClick={handleSaveAsTemplate}>
                            Save
                        </Button>
                    </div>
                )}
            </div>
            <div className='flex justify-end mt-4'>
                <Button disabled={isPending} type="submit" form="form">Add Trigger</Button>
            </div>
        </div>
    );
};

export default SmartEmailTriggerForm;
