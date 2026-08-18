"use client";

import { useMemo, useState } from "react";
import {
  Mail,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Inbox,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommunicationLogDTO } from "@/server/actions/communication-actions";
import { formatDistanceToNow } from "date-fns";

type Props = {
  logs: CommunicationLogDTO[];
};

const statusConfig = {
  sent: {
    label: "Sent",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
  },
  draft: {
    label: "Draft",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
} as const;

const CommunicationInbox = ({ logs }: Props) => {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    logs[0]?._id ?? null
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.subject.toLowerCase().includes(q) ||
        l.to.toLowerCase().includes(q) ||
        (l.toName?.toLowerCase().includes(q) ?? false)
    );
  }, [logs, query]);

  const selected =
    filtered.find((l) => l._id === selectedId) ?? filtered[0] ?? null;

  if (logs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Sent emails will appear here. Compose a message or wait for
            automated pipeline emails to land in the log.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[560px]">
      <Card className="overflow-hidden flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search subject or recipient…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1 max-h-[520px]">
          <div className="divide-y">
            {filtered.map((log) => {
              const active = selected?._id === log._id;
              const cfg =
                statusConfig[log.status as keyof typeof statusConfig] ??
                statusConfig.sent;
              return (
                <button
                  key={log._id}
                  type="button"
                  onClick={() => setSelectedId(log._id)}
                  className={`w-full text-left p-4 transition-colors ${
                    active ? "bg-primary/5" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {log.toName || log.to}
                    </p>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm truncate text-foreground/90">
                    {log.subject}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${cfg.className}`}
                    >
                      {cfg.label}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground capitalize">
                      {log.type.replace(/_/g, " ")}
                    </span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No matches for “{query}”
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      <Card className="overflow-hidden">
        {selected ? (
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {selected.subject}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    To{" "}
                    <span className="text-foreground font-medium">
                      {selected.toName
                        ? `${selected.toName} <${selected.to}>`
                        : selected.to}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    From {selected.from} ·{" "}
                    {new Date(selected.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const cfg =
                      statusConfig[
                        selected.status as keyof typeof statusConfig
                      ] ?? statusConfig.sent;
                    const Icon = cfg.icon;
                    return (
                      <Badge
                        variant="outline"
                        className={`${cfg.className} flex items-center gap-1`}
                      >
                        <Icon size={12} />
                        {cfg.label}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
              {selected.error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {selected.error}
                </p>
              )}
            </div>

            <div className="rounded-xl border bg-muted/30 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <Mail size={14} />
                Message
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {selected.body}
              </div>
            </div>

            {selected.resendId && (
              <p className="text-xs text-muted-foreground font-mono">
                Delivery id: {selected.resendId}
              </p>
            )}
          </CardContent>
        ) : (
          <CardContent className="py-16 text-center text-muted-foreground">
            Select a message to preview
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default CommunicationInbox;
