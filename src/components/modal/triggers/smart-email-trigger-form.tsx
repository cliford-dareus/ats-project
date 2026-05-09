import { z } from "zod";
import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartEmailTriggerSchema } from "@/zod";
import { EMAIL_TEMPLATES } from "@/lib/templates";
import { Textarea } from "@/components/ui/textarea";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getEmailTemplates, saveEmailTemplate } from "@/server/queries/mongo/email-templates";
import { ArrowRight, CheckCircle2, Clock, Loader2, Mail, Save } from "lucide-react";
import SmartTriggerLayout from "@/components/smart-trigger/smart-trigger-layout";

type EmailTemplate = {
    id: string;
    name: string;
    subject: string;
    body: string;
    isDefault: boolean;
    templateId: string;
    _id?: string;
};

type Props = {
    onSubmit: (data: TriggerAction) => void;
};

type FormValues = z.infer<typeof SmartEmailTriggerSchema>;

const SmartEmailTriggerForm = ({ onSubmit }: Props) => {
    const [savedTemplates, setSavedTemplates] = useState<EmailTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [isPending, startTransition] = useTransition();

    // UI State
    const [showSaveAs, setShowSaveAs] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(SmartEmailTriggerSchema),
        defaultValues: {
            subject: '',
            template: '',
            body: '',
            delay: 0,
            delayFormat: "minutes",
        },
    });

    const { watch, setValue, control, handleSubmit: handleFormSubmit } = form;
    const watchedValues = watch();

    // 1. Fetch templates on mount
    const fetchTemplates = useCallback(async () => {
        try {
            const res = await getEmailTemplates();
            setSavedTemplates(JSON.parse(res));
        } catch (error) {
            console.error("Failed to fetch templates", error);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);


    // 2. Memoize combined template list
    const allTemplates = useMemo(() => [
        ...EMAIL_TEMPLATES.map(t => ({
            id: t.id,
            name: t.name,
            subject: t.defaultProps.subject,
            body: t.defaultProps.body,
            isDefault: true,
            templateId: t.id,
            isSaved: false
        })),
        ...savedTemplates.map(t => ({ ...t, id: t._id, isSaved: true }))
    ], [savedTemplates]);

    // 3. Handle template selection
    const handleTemplateChange = (value: string) => {
        const template = allTemplates.find(t => t.id === value);

        if (template) {
            setSelectedTemplate(template);
            setValue('template', value);
            setValue('subject', template.subject || '');
            setValue('body', template.body || '');
        }
    };

    // 4. Auto-save logic (only for custom saved templates)
    useEffect(() => {
        if (!selectedTemplate || selectedTemplate.isDefault) return;

        const delayDebounceFn = setTimeout(async () => {
            // Only auto-save if values have actually changed from the template state
            if (watchedValues.subject === selectedTemplate.subject &&
                watchedValues.body === selectedTemplate.body) return;

            setIsSaving(true);
            try {
                await saveEmailTemplate({
                    id: selectedTemplate.id,
                    templateId: selectedTemplate.templateId,
                    subject: watchedValues.subject,
                    body: watchedValues.body,
                    name: selectedTemplate.name
                });
                setLastSaved(new Date());
            } catch (err) {
                console.error('Auto-save failed:', err);
            } finally {
                setIsSaving(false);
            }
        }, 1500); // 1.5s debounce

        return () => clearTimeout(delayDebounceFn);
    }, [watchedValues.subject, watchedValues.body, selectedTemplate]);

    // 5. Save as New Template
    const handleSaveAsTemplate = async () => {
        if (!newTemplateName.trim()) return;

        setIsSaving(true);
        try {
            const res = await saveEmailTemplate({
                name: newTemplateName.trim(),
                subject: watchedValues.subject,
                body: watchedValues.body,
                templateId: selectedTemplate?.templateId,
            });

            const result = JSON.parse(res);
            if (result.success) {
                setShowSaveAs(false);
                setNewTemplateName("");
                await fetchTemplates();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const onFormSubmit = (data: FormValues) => {
        startTransition(() => {
            onSubmit({
                id: Date.now(), // or 0 if handled by parent
                action_type: "EMAIL",
                config: {
                    condition: {
                        type: "email",
                        target: "Always"
                    },
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

    return (
        <SmartTriggerLayout
            SubmitLabel="Add Trigger"
            icon={<ArrowRight />}
            title="Smart Email Trigger"
            description="Send an automated email when this trigger condition is met"
            isPending={isPending}
        >
            <Form {...form}>
                <form id="trigger-form" onSubmit={handleFormSubmit(onFormSubmit)} className="space-y-4">
                    <div className='border p-4 bg-muted/50 rounded-lg space-y-4'>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name="template"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Template Base</FormLabel>
                                        <Select onValueChange={handleTemplateChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a template" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {allTemplates.map((t) => (
                                                    <SelectItem key={t.id} value={t?.id}>
                                                        {t.isSaved ? `💾 ${t.name}` : t.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject Line</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Hello {{name}}..." {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={control}
                            name="body"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between items-end">
                                        <FormLabel>Email Body</FormLabel>
                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            {isSaving ? (
                                                <><Loader2 className="h-3 w-3 animate-spin" /> Saving changes...</>
                                            ) : lastSaved ? (
                                                <><CheckCircle2 className="h-3 w-3 text-green-500" /> Saved {lastSaved.toLocaleTimeString()}</>
                                            ) : null}
                                        </div>
                                    </div>
                                    <FormControl>
                                        <Textarea className="min-h-[120px] font-mono text-sm" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* Delay Row */}
                        <div>
                            <FormLabel className="text-base font-medium mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Delay Execution
                            </FormLabel>
                            <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border">
                                <FormField
                                    control={form.control}
                                    name="delay"
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            className="w-28"
                                            min={0}
                                            {...field}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="delayFormat"
                                    render={({ field }) => (
                                        <div className="flex gap-2">
                                            {["minutes", "hours", "days"].map((unit) => (
                                                <Button
                                                    key={unit}
                                                    type="button"
                                                    variant={field.value === unit ? "default" : "outline"}
                                                    size="sm"
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
                    </div>
                </form>
            </Form>

            {/* Preview Frame */}
            {selectedTemplate && (
                <div className="rounded-md border overflow-hidden bg-white">
                    <div className="bg-zinc-100 px-3 py-1 text-[10px] border-b font-medium text-zinc-500 uppercase tracking-wider">
                        Live Preview
                    </div>
                    <iframe
                        src={`/api/templates/preview?id=${selectedTemplate.isDefault ? selectedTemplate.id : selectedTemplate.templateId}`}
                        className="w-full h-[300px]"
                        title="Template Preview"
                    />
                </div>
            )}

            {/* Actions Footer */}
            <div className="flex flex-col gap-4 border-t pt-4">
                <div className="flex justify-between items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSaveAs(!showSaveAs)}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Save as New Template
                    </Button>
                </div>

                {showSaveAs && (
                    <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                        <Input
                            placeholder="New Template Name..."
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            autoFocus
                        />
                        <Button
                            variant="secondary"
                            onClick={handleSaveAsTemplate}
                            disabled={!newTemplateName.trim() || isSaving}
                        >
                            Save Template
                        </Button>
                    </div>
                )}
            </div>
        </SmartTriggerLayout>
    );
};

export default SmartEmailTriggerForm;
