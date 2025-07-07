import React, {useEffect, useState} from 'react';
import {Button} from "@/components/ui/button";
import {create_note} from "@/server/queries/mongo/note";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormControl, FormMessage } from '../ui/form';
import { Input } from '../ui/input';

const NOTE_ENUM = ["POSITIVE", "NEGATIVE", "NEUTRAL"] as const;

export const noteSchema = z.object({
    content: z.string().min(1).max(1000),
    note_parent_id: z.string().min(1),
    note_parent_type: z.string().min(1).max(100),
    type: z.enum(NOTE_ENUM).optional(),
});

const CreateNoteModal = ({prefix, parent_id, parent_type}: { prefix: string, parent_id: number, parent_type: string }) => {
    const form = useForm<z.infer<typeof noteSchema>>({
        resolver: zodResolver(noteSchema),
        defaultValues: {
            content: "",
            note_parent_id: prefix + "_" + parent_id,
            note_parent_type: parent_type,
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
    };

    return (
        <div className="p-4">
            <Form {...form}>
                 <form onSubmit={form.handleSubmit(addNote)}>
                    <FormField
                        control={form.control}
                        name="content"
                        render={({field}) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="Add a note" {...field} />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <Button type="submit">Add Note</Button>
                </form>
            </Form>
        </div>
    );
};

export default CreateNoteModal;
