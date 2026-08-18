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
import { Loader2, Send } from "lucide-react";
import {
  EmailTemplateDTO,
  sendManualEmailAction,
} from "@/server/actions/communication-actions";

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
};

const ComposeEmailDialog = ({
  open,
  onOpenChange,
  templates,
  systemTemplates,
  onSent,
}: Props) => {
  const [to, setTo] = useState("");
  const [toName, setToName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateKey, setTemplateKey] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
          to,
          toName: toName || undefined,
          subject,
          body,
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="to">To (email)</Label>
              <Input
                id="to"
                type="email"
                placeholder="candidate@email.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toName">Recipient name</Label>
              <Input
                id="toName"
                placeholder="Alex Rivera"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
              />
            </div>
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
