"use client";

import React from 'react';
import {create_note} from "@/server/queries/mongo/note";
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Form, FormField, FormItem, FormControl} from '../ui/form';
import {Input} from '../ui/input';
import {Command, Send} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {useForm} from "react-hook-form";

export const NOTE_ENUM = ["NEUTRAL", "POSITIVE", "NEGATIVE"] as const;

export const noteSchema = z.object({
    text: z.string().min(1).max(1000),
    note_id: z.string().min(1),
    note_type: z.string().min(1).max(100),
    type: z.enum(NOTE_ENUM).optional(),
});

type Props = {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    parent_id: number;
    parent_type: string;
};

const CreateNoteModal = ({parent_id, parent_type, isOpen, setIsOpen}: Props) => {
    const form = useForm<z.infer<typeof noteSchema>>({
        resolver: zodResolver(noteSchema),
        defaultValues: {
            text: "",
            note_id: parent_type + "_" + parent_id,
            note_type: parent_type,
            type: "NEUTRAL",
        },
    });

    const addNote = async (data: z.infer<typeof noteSchema>) => {
        try {
            const response = await create_note({...data});
            console.log(response);
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
                        <Command/>
                    </div>
                    <div className="">
                        <DialogTitle className="text-2xl uppercase">Edit Job</DialogTitle>
                        <DialogDescription>Complete each step to create a candidate!</DialogDescription>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(addNote)} className="relative">
                        <div className="flex items-center w-full gap-2">
                            <FormField
                                name="type"
                                render={({field}) => (
                                    <FormItem>
                                        <FormControl>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                defaultValue={NOTE_ENUM[0]}
                                            >
                                                <SelectTrigger
                                                    className="border-zinc-200 focus:outline-none rounded-xl">
                                                    <SelectValue/>
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
                                render={({field}) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="Quick note..."
                                                {...field}
                                                className="w-full pl-4 pr-10 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <button
                            type="submit"
                            // disabled={!newNote.trim()}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-all disabled:opacity-30"
                        >
                            <Send className="w-3.5 h-3.5"/>
                        </button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateNoteModal;
