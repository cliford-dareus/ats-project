"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommunicationInbox from "./communication-inbox";
import CommunicationTemplates from "./communication-templates";
import ComposeEmailDialog from "./compose-email-dialog";
import {
  CommunicationLogDTO,
  EmailTemplateDTO,
} from "@/server/actions/communication-actions";

type Props = {
  templates: EmailTemplateDTO[];
  systemTemplates: Array<{
    templateId: string;
    name: string;
    subject: string;
    body: string;
    isSystem?: boolean;
  }>;
  logs: CommunicationLogDTO[];
};

const CommunicationPageClient = ({
  templates,
  systemTemplates,
  logs,
}: Props) => {
  const router = useRouter();
  const [view, setView] = useState<"inbox" | "templates">("inbox");
  const [composeOpen, setComposeOpen] = useState(false);

  const refresh = () => router.refresh();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Communication</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Inbox of sent messages and reusable email templates for your hiring
            pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1 bg-muted/40">
            <Button
              size="sm"
              variant={view === "inbox" ? "default" : "ghost"}
              onClick={() => setView("inbox")}
            >
              Inbox
              <span className="ml-2 text-xs opacity-70">{logs.length}</span>
            </Button>
            <Button
              size="sm"
              variant={view === "templates" ? "default" : "ghost"}
              onClick={() => setView("templates")}
            >
              Templates
              <span className="ml-2 text-xs opacity-70">
                {templates.length}
              </span>
            </Button>
          </div>
          <Button onClick={() => setComposeOpen(true)}>Compose</Button>
        </div>
      </div>

      {view === "inbox" ? (
        <CommunicationInbox logs={logs} />
      ) : (
        <CommunicationTemplates
          templates={templates}
          systemTemplates={systemTemplates}
          onRefresh={refresh}
        />
      )}

      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        templates={templates}
        systemTemplates={systemTemplates}
        onSent={refresh}
      />
    </div>
  );
};

export default CommunicationPageClient;
