"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Mail,
    Search,
    CheckCircle2,
    Inbox,
    Star,
    Users,
    Tag,
    Briefcase,
    User,
    Sparkles,
    Paperclip,
    Send,
    Loader2,
} from "lucide-react";
import { applyPlaceholders, cn } from "@/lib/utils";
import { EmailTemplateDTO, ThreadItem } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { sendManualEmailAction } from "@/server/actions/communication-actions";
import {
    MentionTextarea,
    type MentionRef,
    type MentionUser,
} from "@/components/mentions-text-area";

type Props = {
    logs: ThreadItem[];
    templates: EmailTemplateDTO[];
    systemTemplates: {
        name: string;
        body: string;
        subject: string;
        templateId: string;
        isSystem?: boolean;
    }[];
    users: MentionUser[];
};

const CommunicationInbox = ({ logs, templates, systemTemplates, users }: Props) => {
    // Local, mutable copy of the threads so we can do optimistic updates.
    // Re-syncs whenever the parent gives us a fresh `logs` prop (e.g. after a refetch).
    const [threads, setThreads] = useState<ThreadItem[]>(logs);
    useEffect(() => {
        setThreads(logs);
    }, [logs]);

    const [messageText, setMessageText] = useState('');
    const [mentions, setMentions] = useState<MentionRef[]>([]);

    const onChange = (e: string) => {
        setMessageText(e);
    };

    const [activeThreadId, setActiveThreadId] = useState<string>(logs[0]?._id || '');
    const [filterFolder, setFilterFolder] = useState<'all' | 'unread' | 'starred' | 'team'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [composerMode, setComposerMode] = useState<'reply' | 'internal'>('reply');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [isGeneratingAi,] = useState(false);

    const [isSending, setIsSending] = useState(false);
    const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
    const [, setSendError] = useState<string | null>(null);

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

    // Apply Template
    const handleApplyTemplate = (templateId: string) => {
        const tmpl = allTemplates.find(t => t.templateId === templateId);
        if (tmpl && activeThread) {
            setMessageText(applyPlaceholders(tmpl.body, {
                candidateName: activeThread.candidate_name,
                candidateRole: activeThread.candidate_role
            }));
            setSelectedTemplate(templateId);
        }
    };

    // Active Selected Thread
    const activeThread = useMemo(() => {
        return threads.find(t => t._id === activeThreadId);
    }, [threads, activeThreadId]);

    // Filtered threads list
    const filteredThreads = useMemo(() => {
        return threads.filter(t => {
            const matchesSearch = t.candidate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.candidate_role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.last_message.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (filterFolder === 'unread') return t.unread_count > 0;
            if (filterFolder === 'starred') return t.starred;
            if (filterFolder === 'team') return t.messages.some(m => m.sender === 'team');
            return true;
        });
    }, [threads, searchQuery, filterFolder]);

    // Toggle Star
    // const handleToggleStar = (threadId: string) => {
    //     setLogs(prev => prev.map(t => {
    //         if (t._id === threadId) {
    //             return { ...t, starred: !t.starred };
    //         }
    //         return t;
    //     }));
    // };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        const text = messageText.trim();
        if (!text || !activeThread || isSending) return;

        setIsSending(true);
        setSendError(null);
        setDeliveryStatus(null);

        // Build an optimistic message so the UI feels instant.
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            _id: tempId,
            text,
            authorName: 'You', // TODO: swap in the real logged-in user's name
            sender: composerMode === 'reply' ? 'recruiter' : 'team',
            channel: composerMode === 'reply' ? 'Email' : 'Internal Note',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        } as ThreadItem['messages'][number];

        const threadId = activeThread._id;
        setThreads(prev => prev.map(t => t._id === threadId
            ? {
                ...t,
                messages: [...t.messages, optimisticMessage],
                last_message: text,
                last_timestamp: 'Just now',
            }
            : t
        ));

        setMessageText('');

        try {
            await sendManualEmailAction({
                body: text,
                threadId: threadId,
                mode: composerMode,
                subject: composerMode === 'reply' ? 'Reply to Candidate' : 'Internal Note',
                mentions: mentions,
            });

            setDeliveryStatus(
                composerMode === 'reply'
                    ? `Email sent to ${activeThread.candidate_name}`
                    : 'Internal note posted'
            );
            setTimeout(() => setDeliveryStatus(null), 4000);
        } catch (err) {
            // Roll back the optimistic message and give the user their draft back.
            setThreads(prev => prev.map(t => t._id === threadId
                ? { ...t, messages: t.messages.filter(m => m._id !== tempId) }
                : t
            ));
            setMessageText(text);
            setSendError((err as Error)?.message || 'Something went wrong sending your message.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden grid grid-cols-1 grid-rows-1 lg:grid-cols-12 min-h-[700px] h-[calc(100vh_-_235px)]">
            {/* LEFT COLUMN: Threads List & Folder Filters (4 Cols) */}
            <div className="lg:col-span-4 border-r border-zinc-200 flex flex-col bg-zinc-50/40">

                {/* Search & Folder Controls */}
                <div className="p-4 border-b border-zinc-200 space-y-3 bg-white">

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search candidates or conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>

                    {/* Folder Filters */}
                    <div className="flex items-center justify-between gap-1">
                        {[
                            { id: 'all', label: 'All Inbox', icon: Inbox },
                            { id: 'unread', label: 'Unread', icon: Mail },
                            { id: 'starred', label: 'Starred', icon: Star },
                            { id: 'team', label: 'Team Notes', icon: Users },
                        ].map((folder) => {
                            const Icon = folder.icon;
                            const isActive = filterFolder === folder.id;
                            return (
                                <button
                                    key={folder.id}
                                    onClick={() => setFilterFolder(folder.id as 'starred' | 'all' | 'unread' | 'team')}
                                    className={cn(
                                        "flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                                        isActive
                                            ? "bg-zinc-900 text-white shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                                    )}
                                >
                                    <Icon className="w-3 h-3" />
                                    {folder.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Threads Stream List */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
                    {filteredThreads.length > 0 ? (
                        filteredThreads.map((thread) => {
                            const isSelected = thread._id === activeThread?._id;
                            return (
                                <div
                                    key={thread._id}
                                    onClick={() => {
                                        setActiveThreadId(thread._id);
                                        // setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unreadCount: 0 } : t));
                                    }}
                                    className={cn(
                                        "p-4 cursor-pointer transition-colors relative group flex items-start gap-3",
                                        isSelected
                                            ? "bg-teal-100 border-l-4 border-primary text-white"
                                            : "hover:bg-zinc-100/60 bg-white"
                                    )}
                                >
                                    <Avatar>
                                        <AvatarImage
                                            src={thread.candidate_avatar}
                                            alt={thread.candidate_name}
                                            className="w-10 h-10 rounded-2xl object-cover ring-2 ring-zinc-100 flex-shrink-0"
                                            referrerPolicy="no-referrer" />
                                        <AvatarFallback>CN</AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className={cn("text-xs font-bold truncate", isSelected ? "text-primary" : "text-zinc-900")}>
                                                {thread.candidate_name}
                                            </h4>
                                            <span className="text-[10px] text-zinc-400 font-medium flex-shrink-0">
                                                {thread.last_timestamp}
                                            </span>
                                        </div>

                                        <p className="text-[11px] font-semibold text-primary truncate">
                                            {thread.candidate_role}
                                        </p>

                                        <p className="text-xs text-zinc-500 truncate font-normal">
                                            {thread.last_message}
                                        </p>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200/60">
                                                {thread.candidate_status}
                                            </span>

                                            <div className="flex items-center gap-1.5">
                                                {thread.unread_count > 0 && (
                                                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // handleToggleStar(thread._id);
                                                    }}
                                                    className="text-zinc-300 hover:text-amber-500 transition-colors"
                                                >
                                                    <Star className={cn("w-3.5 h-3.5", thread.starred && "text-amber-500 fill-amber-500")} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-xs text-zinc-400 font-medium">
                            No conversation threads match your filter.
                        </div>
                    )}
                </div>
            </div>

            {/* MIDDLE COLUMN: Active Conversation & Reply Center (8 Cols) */}
            {activeThread ? (
                <div className="lg:col-span-8 flex-1 flex flex-col bg-white">

                    {/* Thread Header Bar */}
                    <div className="p-6 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4 bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage
                                    src={activeThread.candidate_avatar}
                                    alt={activeThread.candidate_name}
                                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-zinc-100"
                                    referrerPolicy="no-referrer"
                                />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-zinc-900 tracking-tight">{activeThread.candidate_name}</h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary border border-primary/20 text-primary/70">
                                        {activeThread.candidate_status}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 font-medium flex items-center gap-2 mt-0.5">
                                    <Briefcase className="w-3.5 h-3.5 text-primary/60" />
                                    {activeThread.candidate_role} • {activeThread.candidate_email}
                                </p>
                            </div>
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                // onClick={() => router.push(`/dashboard/candidates/${activeThread.candidate_id}`)}
                                className="px-3.5 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 transition-all flex items-center gap-1.5"
                            >
                                <User className="w-3.5 h-3.5 text-zinc-500" />
                                Full Profile
                            </button>

                            <button
                                // onClick={() => handleToggleStar(activeThread._id)}
                                className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
                            >
                                <Star className={cn("w-4 h-4", activeThread.starred ? "text-amber-500 fill-amber-500" : "text-zinc-400")} />
                            </button>
                        </div>
                    </div>

                    {/* Conversation Messages Feed */}
                    <div className="p-6 overflow-y-scroll h-[50%] space-y-4 bg-zinc-50/30">
                        {activeThread.messages.map((msg) => {
                            const isCandidate = msg.sender === 'candidate';
                            const isInternalNote = msg.sender === 'team';

                            return (
                                <div
                                    key={msg?._id}
                                    className={cn(
                                        "p-5 rounded-2xl border transition-all space-y-2 max-w-2xl",
                                        isCandidate
                                            ? "bg-white border-zinc-200 mr-auto"
                                            : isInternalNote
                                                ? "bg-amber-50/80 border-amber-200 mx-auto w-full text-amber-950"
                                                : "bg-primary text-white border-primary/40 ml-auto"
                                    )}
                                >
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <div className="flex items-center gap-2">
                                            {isInternalNote && <Tag className="w-3.5 h-3.5 text-amber-600" />}
                                            <span className={isInternalNote ? "text-amber-900" : isCandidate ? "text-zinc-900" : "text-white"}>
                                                {msg.authorName}
                                            </span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold",
                                                isInternalNote
                                                    ? "bg-amber-200 text-amber-800"
                                                    : isCandidate
                                                        ? "bg-zinc-100 text-zinc-600"
                                                        : "bg-teal-500 text-white"
                                            )}>
                                                {msg.channel}
                                            </span>
                                        </div>
                                        <span className={isCandidate || isInternalNote ? "text-zinc-400 font-normal" : "text-teal-100 font-normal"}>
                                            {new Date(msg.createdAt).toLocaleString()}
                                        </span>
                                    </div>

                                    <p className={cn("text-xs leading-relaxed whitespace-pre-wrap font-medium", isCandidate ? "text-zinc-700" : isInternalNote ? "text-amber-900" : "text-white")}>
                                        {msg.text}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Rich Composer Center */}
                    <div className="p-6 border-t border-zinc-200 bg-white space-y-4">

                        {/* Delivery notification */}
                        {deliveryStatus && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                {deliveryStatus}
                            </div>
                        )}

                        {/* Mode Toggle & AI Magic Assistant Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3">

                            {/* Reply vs Internal Note Selector */}
                            <div className="bg-zinc-100 p-1 rounded-2xl flex items-center gap-1">
                                <button
                                    onClick={() => setComposerMode('reply')}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        composerMode === 'reply' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                                    )}
                                >
                                    <Mail className="w-3.5 h-3.5 text-primary" />
                                    Reply Candidate (Email)
                                </button>

                                <button
                                    onClick={() => setComposerMode('internal')}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        composerMode === 'internal' ? "bg-amber-100 text-amber-900 shadow-sm" : "text-zinc-500"
                                    )}
                                >
                                    <Tag className="w-3.5 h-3.5 text-amber-700" />
                                    Internal Team Note
                                </button>
                            </div>

                            {/* Templates & AI Generator */}
                            {composerMode === 'reply' && (
                                <div className="flex items-center gap-2">

                                    {/* Template Dropdown */}
                                    <select
                                        value={selectedTemplate}
                                        onChange={(e) => handleApplyTemplate(e.target.value)}
                                        className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer"
                                    >
                                        <option value="">Insert Email Template...</option>
                                        {allTemplates.map(t => (
                                            <option key={t.key} value={t.templateId}>{t.label}</option>
                                        ))}
                                    </select>

                                    {/* AI Magic Draft Button */}
                                    <button
                                        type="button"
                                        // onClick={handleGenerateAiReply}
                                        disabled={isGeneratingAi}
                                        className="px-3.5 py-1.5 bg-primary/50 border border-primary/20 hover:bg-primary/10 text-primary/70 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                    >
                                        {isGeneratingAi ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary/60" />
                                                Drafting...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5 text-primary/60" />
                                                AI Smart Draft
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Form & Textarea */}
                        <form onSubmit={handleSendMessage} className="space-y-3">
                            <MentionTextarea
                                value={messageText}
                                setValue={setMessageText}
                                onChange={onChange}
                                mentions={mentions}
                                onMentionsChange={(m) => {
                                    setMentions(m);
                                }}
                                users={users}
                                placeholder={
                                    composerMode === 'reply'
                                        ? `Type your email response to ${activeThread.candidate_name}...`
                                        : `Add internal feedback or @mention hiring managers...`
                                }
                                className={cn(
                                    "w-full rounded-2xl p-4 text-xs font-medium focus:outline-none focus:ring-2 transition-all",
                                    composerMode === 'reply'
                                        ? "bg-zinc-50 border border-zinc-200 focus:ring-primary/20 focus:border-primary/50"
                                        : "bg-amber-50/50 border border-amber-200 focus:ring-amber-500/20 focus:border-amber-500 text-amber-950"
                                )}
                            />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                                    <button type="button" className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500 transition-colors" title="Attach file">
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <span className="text-[11px]">Markdown & Variables Supported</span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!messageText.trim()}
                                    className={cn(
                                        "px-6 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-40",
                                        composerMode === 'reply'
                                            ? "bg-primary/60 hover:bg-primary/70 text-white shadow-primary/20"
                                            : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20"
                                    )}
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {composerMode === 'reply' ? 'Send Email' : 'Post Team Note'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="lg:col-span-8 flex items-center justify-center p-12 text-center text-zinc-400">
                    Select a thread to view candidate conversation.
                </div>
            )}
        </div>
    );
};

export default CommunicationInbox;
