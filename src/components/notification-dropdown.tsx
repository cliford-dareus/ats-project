"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bell, Mail, Zap, CheckCheck, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { get_my_notifications_action, mark_notifications_read_action } from "@/server/actions/notification-actions";

type NotificationItem = {
    _id: string;
    kind: string;
    title: string;
    body: string;
    link?: string;
    actor_name?: string;
    read: boolean;
    created_at: string;
};

type NotificationState = {
    items: NotificationItem[];
    unread: number;
};

const KIND_ICONS: Record<string, React.ReactNode> = {
    mention: <Mail className="h-4 w-4 text-blue-500" />,
    automation: <Zap className="h-4 w-4 text-amber-500" />,
    interview_confirmed: <CheckCheck className="h-4 w-4 text-emerald-500" />,
    interview_declined: <CheckCheck className="h-4 w-4 text-red-500" />,
    system: <Bell className="h-4 w-4 text-gray-500" />,
};

function timeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
}

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState<NotificationState>({ items: [], unread: 0 });
    const [loading, setLoading] = useState(true);
    const [markingRead, setMarkingRead] = useState(false);
    const [open, setOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const result = await get_my_notifications_action();
            if (result && "items" in result) {
                setNotifications(result as NotificationState);
            }
        } catch (error) {
            console.warn("[NotificationDropdown] Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Poll for new notifications every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Refetch when dropdown opens
    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open, fetchNotifications]);

    const handleMarkAllRead = async () => {
        if (markingRead) return;
        setMarkingRead(true);
        try {
            await mark_notifications_read_action();
            fetchNotifications();
        } catch (error) {
            console.warn("[NotificationDropdown] Failed to mark as read", error);
        } finally {
            setMarkingRead(false);
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
            await mark_notifications_read_action([id]);
            fetchNotifications();
        } catch (error) {
            console.warn("[NotificationDropdown] Failed to mark as read", error);
        }
    };

    const unread = notifications.unread ?? 0;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-lg hover:bg-accent"
                >
                    <Bell className="h-5 w-5" />
                    {unread > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full bg-red-500 text-white border-2 border-background"
                        >
                            {unread > 99 ? "99+" : unread}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-96 max-h-[min(480px,calc(100vh-120px))] p-0"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unread > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                            disabled={markingRead}
                        >
                            {markingRead ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <CheckCheck className="h-3 w-3" />
                            )}
                            Mark all read
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="overflow-y-auto max-h-[420px]">
                    {loading && notifications.items.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : notifications.items.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No notifications yet
                        </div>
                    ) : (
                        notifications.items.map((item) => (
                            <div
                                key={item._id}
                                className={`group relative flex gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors ${
                                    !item.read ? "bg-accent/20" : ""
                                }`}
                                onClick={() => handleMarkRead(item._id)}
                            >
                                {/* Icon */}
                                <div className="shrink-0 mt-0.5">
                                    {KIND_ICONS[item.kind] ?? KIND_ICONS.system}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-snug">{item.title}</p>
                                    {item.body && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                            {item.body}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[11px] text-muted-foreground">
                                            {timeAgo(item.created_at)}
                                        </span>
                                        {item.actor_name && item.actor_name !== "Automation" && (
                                            <>
                                                <span className="text-[11px] text-muted-foreground">·</span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {item.actor_name}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Unread dot */}
                                {!item.read && (
                                    <div className="shrink-0 mt-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    </div>
                                )}

                                {/* Link overlay */}
                                {item.link && (
                                    <Link
                                        href={item.link}
                                        className="absolute inset-0"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {notifications.items.length > 0 && (
                    <div className="border-t px-4 py-2">
                        <Link
                            href="/notifications"
                            className="text-xs text-primary hover:underline block text-center"
                        >
                            View all notifications
                        </Link>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
