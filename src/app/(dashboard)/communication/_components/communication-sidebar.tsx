"use client";

import React from "react";
import {
  Inbox,
  FileText,
  Send,
  Mail,
  MailOpen,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Props = {
  activeView: "inbox" | "templates";
  onViewChange: (view: "inbox" | "templates") => void;
  inboxCount: number;
  templateCount: number;
  onCompose: () => void;
};

const CommunicationSidebar = ({
  activeView,
  onViewChange,
  inboxCount,
  templateCount,
  onCompose,
}: Props) => {
  const nav = [
    {
      id: "inbox" as const,
      label: "Inbox",
      description: "Sent & logged emails",
      icon: Inbox,
      count: inboxCount,
    },
    {
      id: "templates" as const,
      label: "Templates",
      description: "Reusable email templates",
      icon: FileText,
      count: templateCount,
    },
  ];

  const tips = [
    {
      icon: Mail,
      title: "Manual send",
      text: "Compose from the inbox and optionally start from a template.",
    },
    {
      icon: MailOpen,
      title: "Placeholders",
      text: "Use {{candidateName}}, {{jobTitle}}, {{companyName}} in templates.",
    },
    {
      icon: AlertCircle,
      title: "Automations",
      text: "Pipeline emails still fire via Resend smart triggers in Settings.",
    },
  ];

  return (
    <div className="p-4 flex flex-col h-full space-y-6 overflow-y-auto">
      <div className="space-y-2">
        <Button className="w-full" onClick={onCompose}>
          <Plus size={16} className="mr-2" />
          Compose email
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Send size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Views</span>
        </div>
        {nav.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                active
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "hover:bg-muted border-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {item.count}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      <Separator />

      <div className="space-y-3">
        <span className="text-sm font-medium px-1">Tips</span>
        {tips.map((tip) => {
          const Icon = tip.icon;
          return (
            <div
              key={tip.title}
              className="p-3 rounded-xl border bg-card space-y-1"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon size={14} />
                {tip.title}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tip.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommunicationSidebar;
