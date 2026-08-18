"use client";

import React from "react";
import {
  Inbox,
  FileText,
  Mail,
  MailOpen,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

/**
 * Secondary sidebar panel for Communication (used by AppSidebar).
 * View switching lives on the page; this panel is informational + quick actions.
 */
const CommunicationSidebarStatic = () => {
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
        <Button className="w-full" asChild>
          <Link href="/communication">
            <Plus size={16} className="mr-2" />
            Open Communication
          </Link>
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Inbox size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Sections</span>
        </div>
        <div className="rounded-xl border p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Inbox size={14} />
            Inbox
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Sent & logged emails for this organization
          </p>
        </div>
        <div className="rounded-xl border p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText size={14} />
            Templates
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Reusable messages for invites, rejections, follow-ups
          </p>
        </div>
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

export default CommunicationSidebarStatic;
