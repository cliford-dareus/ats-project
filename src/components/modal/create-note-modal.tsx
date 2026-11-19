"use client";

import React, { useState } from 'react';
import { create_note } from "@/server/queries/mongo/note";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormControl } from '../ui/form';
import { Command, Send } from "lucide-react";
import { MentionTextarea, type MentionRef, type MentionUser } from "@/components/mentions-text-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";

export const NOTE_ENUM = ["NEUTRAL", "POSITIVE", "NEGATIVE"] as const;

export const noteSchema = z.object({
    text: z.string().min(1).max(1000),
    note_id: z.string().min(1),
    note_type: z.string().min(1).max(100),
    candidate_id: z.number(),
    type: z.enum(NOTE_ENUM).optional(),
    // Structured @mentions picked in the composer — re-verified against org
    // membership server-side before they are persisted or notified.
    mentions: z.array(z.object({
        userId: z.string().min(1),
        name: z.string().min(1),
        username: z.string().nullable().optional(),
    })).optional().default([]),
});

type Props = {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    parent_id: number;
    parent_type: string;
    candidate_id: number | undefined;
    users: MentionUser[];
};

const CreateNoteModal = ({ parent_id, parent_type, isOpen, setIsOpen, candidate_id, users }: Props) => {
    const [mentions, setMentions] = useState<MentionRef[]>([]);

    const form = useForm<z.infer<typeof noteSchema>>({
        resolver: zodResolver(noteSchema),
        defaultValues: {
            text: "",
            note_id: parent_type + "_" + parent_id,
            note_type: parent_type,
            type: "NEUTRAL",
            mentions: [],
        },
    });

    const addNote = async (data: z.infer<typeof noteSchema>) => {
        if (candidate_id == null) {
            console.error("Cannot create note: no candidate selected");
            return;
        }
        try {
            // Use mentions from MentionTextarea state, not the form's default empty array
            const response = await create_note({ ...data, candidate_id, mentions });
            console.log(response);
            if (typeof response === "string") {
                form.reset();
                setMentions([]);
                setIsOpen(false);
            }
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger></DialogTrigger>
            <DialogContent className="p-4 max-w-xl">
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div
                        className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Command />
                    </div>
                    <div className="">
                        <DialogTitle className="text-2xl uppercase">Add Note</DialogTitle>
                        <DialogDescription>Leave an internal note. Type @ to mention a teammate.</DialogDescription>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(addNote)} className="relative">
                        <div className="flex items-center w-full gap-2">
                            <FormField
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                defaultValue={NOTE_ENUM[0]}
                                            >
                                                <SelectTrigger
                                                    className="border-zinc-200 focus:outline-none rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {NOTE_ENUM.map(type => (
                                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="text"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <MentionTextarea
                                                value={field.value}
                                                setValue={field.onChange}
                                                onChange={field.onChange}
                                                mentions={mentions}
                                                onMentionsChange={setMentions}
                                                users={users}
                                                placeholder="Quick note... Type @ to mention someone"
                                                className="w-full"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <button
                                type="submit"
                                className="shrink-0 self-start p-2 mt-1 text-brand-600 hover:bg-brand-50 rounded-lg transition-all disabled:opacity-30"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateNoteModal;
