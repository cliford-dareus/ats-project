"use client";

import { useState, useTransition } from "react";
import {
    FileText,
    Plus,
    Pencil,
    Trash2,
    Sparkles,
    Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    deleteEmailTemplateAction,
    EmailTemplateDTO,
    seedSystemTemplatesAction,
} from "@/server/actions/communication-actions";
import TemplateEditorDialog from "./template-editor-dialog";

type SystemTemplate = {
    templateId: string;
    name: string;
    subject: string;
    body: string;
    isSystem?: boolean;
};

type Props = {
    templates: EmailTemplateDTO[];
    systemTemplates: SystemTemplate[];
    onRefresh?: () => void;
};

const CommunicationTemplates = ({
    templates,
    systemTemplates,
    onRefresh,
}: Props) => {
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<EmailTemplateDTO | null>(null);
    const [preview, setPreview] = useState<
        EmailTemplateDTO | SystemTemplate | null
    >(templates[0] ?? systemTemplates[0] ?? null);
    const [pending, startTransition] = useTransition();

    const openCreate = () => {
        setEditing(null);
        setEditorOpen(true);
    };

    const openEdit = (tpl: EmailTemplateDTO) => {
        setEditing(tpl);
        setEditorOpen(true);
    };

    const handleDelete = (id: string) => {
        if (!confirm("Delete this template?")) return;
        startTransition(async () => {
            await deleteEmailTemplateAction(id);
            onRefresh?.();
        });
    };

    const handleSeed = () => {
        startTransition(async () => {
            await seedSystemTemplatesAction();
            onRefresh?.();
        });
    };

    const copyAsCustom = (tpl: SystemTemplate) => {
        setEditing({
            _id: "",
            organizationId: "",
            templateId: `${tpl.templateId}_custom`,
            name: `${tpl.name} (copy)`,
            subject: tpl.subject,
            body: tpl.body,
        });
        setEditorOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Email templates</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage reusable messages for invites, rejections, and follow-ups.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSeed} disabled={pending}>
                        <Sparkles size={16} className="mr-2" />
                        Seed system templates
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus size={16} className="mr-2" />
                        New template
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                        Your templates ({templates.length})
                    </p>
                    {templates.length === 0 && (
                        <Card className="border-dashed">
                            <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                No custom templates yet. Create one or seed the system set.
                            </CardContent>
                        </Card>
                    )}
                    {templates.map((tpl) => (
                        <Card
                            key={tpl._id}
                            className={`cursor-pointer transition-colors ${preview && "_id" in preview && preview._id === tpl._id
                                ? "border-primary/40 bg-primary/5"
                                : "hover:bg-muted/40"
                                }`}
                            onClick={() => setPreview(tpl)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} className="text-muted-foreground" />
                                            <p className="font-medium text-sm truncate">{tpl.name}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 truncate">
                                            {tpl.subject}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEdit(tpl);
                                            }}
                                        >
                                            <Pencil size={14} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(tpl._id);
                                            }}
                                            disabled={pending}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 pt-2">
                        System templates
                    </p>
                    {systemTemplates.map((tpl) => (
                        <Card
                            key={tpl.templateId}
                            className={`cursor-pointer transition-colors ${preview &&
                                !("_id" in preview) &&
                                preview.templateId === tpl.templateId
                                ? "border-primary/40 bg-primary/5"
                                : "hover:bg-muted/40"
                                }`}
                            onClick={() => setPreview(tpl)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm truncate">{tpl.name}</p>
                                            <Badge variant="secondary" className="text-[10px]">
                                                System
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 truncate">
                                            {tpl.subject}
                                        </p>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        title="Copy as custom template"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyAsCustom(tpl);
                                        }}
                                    >
                                        <Copy size={14} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="text-base">
                            {preview?.name ?? "Preview"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        {preview ? (
                            <>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                        Subject
                                    </p>
                                    <p className="text-sm font-medium">{preview.subject}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                        Body
                                    </p>
                                    <div className="rounded-xl border bg-muted/30 p-4 whitespace-pre-wrap text-sm leading-relaxed">
                                        {preview.body}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Select a template to preview.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <TemplateEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                template={editing}
                onSaved={onRefresh}
            />
        </div>
    );
};

export default CommunicationTemplates;
