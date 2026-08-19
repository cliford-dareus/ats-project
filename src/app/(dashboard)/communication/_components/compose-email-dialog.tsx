"use client";

import { useMemo, useState, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Cross, Loader2, Send } from "lucide-react";
import {
    sendManualEmailAction,
} from "@/server/actions/communication-actions";
import { CandidateType, EmailTemplateDTO } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templates: EmailTemplateDTO[];
    systemTemplates: Array<{
        templateId: string;
        name: string;
        subject: string;
        body: string;
    }>;
    onSent?: () => void;
    candidates: CandidateType[];
};

const ComposeEmailDialog = ({
    open,
    onOpenChange,
    templates,
    systemTemplates,
    onSent,
    candidates,
}: Props) => {
    const [to, setTo] = useState("");
    const [toName, setToName] = useState("");

    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [templateKey, setTemplateKey] = useState<string>("none");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const [selectedCandidate, setSelectedCandidate] = useState<CandidateType | null>(null);

    const allTemplates = useMemo(() => {
        const custom = templates.map((t) => ({
            key: `custom:${t._id}`,
            label: t.name,
            subject: t.subject,
            body: t.body,
            templateId: t.templateId,
        }));
        const system = systemTemplates.map((t) => ({
            key: `system:${t.templateId}`,
            label: `${t.name} (system)`,
            subject: t.subject,
            body: t.body,
            templateId: t.templateId,
        }));
        return [...custom, ...system];
    }, [templates, systemTemplates]);

    const filteredCandidates = useMemo(() => {
        if (to == "") {
            setSelectedCandidate(null);
            return [];
        }
        return candidates.filter((candidate) => candidate.email.toLocaleLowerCase().includes(to.toLocaleLowerCase()));
    }, [candidates, to]);

    const applyTemplate = (key: string) => {
        setTemplateKey(key);
        if (key === "none") return;
        const tpl = allTemplates.find((t) => t.key === key);
        if (!tpl) return;
        setSubject(tpl.subject);
        setBody(tpl.body);
    };

    const reset = () => {
        setTo("");
        setToName("");
        setSubject("");
        setBody("");
        setTemplateKey("none");
        setError(null);
    };

    const handleSend = () => {
        setError(null);
        startTransition(async () => {
            try {
                const selected = allTemplates.find((t) => t.key === templateKey);
                await sendManualEmailAction({
                    body,
                    subject,
                    to,
                    toName,
                    candidateId: selectedCandidate?.id,
                    candidateName: selectedCandidate?.name,
                    candidateEmail: selectedCandidate?.email,
                    candidateAvatar: selectedCandidate?.avatar ?? "hhhhsjhds.png",
                    candidateRole: selectedCandidate?.role ?? "Soft",
                    candidateStatus: selectedCandidate?.status ?? "ACTIVE",
                    templateId: selected?.templateId,
                });
                reset();
                onOpenChange(false);
                onSent?.();
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to send");
            }
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) reset();
                onOpenChange(v);
            }}
        >
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">Compose email</DialogTitle>
                    <DialogDescription>
                        Send a one-off message to a candidate. Start from a template or write
                        from scratch.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Start from template</Label>
                        <Select value={templateKey} onValueChange={applyTemplate}>
                            <SelectTrigger>
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Blank email</SelectItem>
                                {allTemplates.map((t) => (
                                    <SelectItem key={t.key} value={t.key}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-full relative">
                        <div className="space-y-2">
                            <Label htmlFor="to">To (email)</Label>
                            <div className="relative w-full">
                                <Input
                                    id="to"
                                    type="email"
                                    className="w-full"
                                    placeholder="candidate@email.com"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                />
                                <Cross
                                    className="absolute top-1/2 -translate-y-1/2 right-3 cursor-pointer"
                                    onClick={() => { setTo(""); setSelectedCandidate(null); }}
                                />
                            </div>
                        </div>

                        {to && selectedCandidate == null && <div className="absolute top-full w-full !rounded-2xl bg-background shadow-md">
                            <div className="p-0 rounded-2xl">
                                {filteredCandidates.map((candidate) => (
                                    <div
                                        onClick={() => {
                                            setSelectedCandidate(candidate);
                                            setTo(candidate.email);
                                            setToName(candidate.name);
                                        }}
                                        key={candidate.id}
                                        className="px-4 py-2 hover:bg-accent cursor-pointer">
                                        <span>{candidate.email}</span>
                                    </div>
                                ))}
                            </div>
                        </div>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            placeholder="Subject line"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="body">Body</Label>
                        <Textarea
                            id="body"
                            rows={10}
                            placeholder="Write your message…"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="resize-y min-h-[180px]"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={pending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSend} disabled={pending}>
                        {pending ? (
                            <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                            <Send size={16} className="mr-2" />
                        )}
                        Send
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ComposeEmailDialog;
