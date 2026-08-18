"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Loader2, Save } from "lucide-react";
import {
  EmailTemplateDTO,
  upsertEmailTemplateAction,
} from "@/server/actions/communication-actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: EmailTemplateDTO | null;
  onSaved?: () => void;
};

const TemplateEditorDialog = ({
  open,
  onOpenChange,
  template,
  onSaved,
}: Props) => {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setSubject(template?.subject ?? "");
      setBody(template?.body ?? "");
      setError(null);
    }
  }, [open, template]);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await upsertEmailTemplateAction({
          id: template?._id,
          name,
          subject,
          body,
          templateId: template?.templateId,
        });
        onOpenChange(false);
        onSaved?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save template");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit template" : "New template"}
          </DialogTitle>
          <DialogDescription>
            Templates support placeholders like {"{{"}}candidateName{"}}"},{" "}
            {"{{"}}jobTitle{"}}"}, {"{{"}}companyName{"}}"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Name</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Phone screen invite"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-subject">Subject</Label>
            <Input
              id="tpl-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-body">Body</Label>
            <Textarea
              id="tpl-body"
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="resize-y min-h-[220px] font-mono text-sm"
              placeholder="Hi {{candidateName}},…"
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
          <Button onClick={handleSave} disabled={pending}>
            {pending ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateEditorDialog;
