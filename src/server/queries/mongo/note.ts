"use server";

import { noteSchema } from "@/components/modal/create-note-modal";
import { db } from "@/drizzle/db";
import { usersTable } from "@/drizzle/schema";
import mongodb from "@/lib/mongodb";
import Note from "@/models/notes";
import { canCreateJob } from "@/server/permissions";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";


export const create_note = async (data: z.infer<typeof noteSchema>) => {
    try {
        await mongodb();

        const {userId} = await auth();
        if (!userId) throw new Error("User not found");

        const user = await db.select().from(usersTable).where(eq(usersTable.id, userId))
        if (!user) throw new Error("User not found");

        const canCreate = await canCreateJob(userId);
        if (!canCreate) throw new Error("You are not authorized to create a note");

        const note = await Note.create({...data, created_by: user[0].id});
        return JSON.stringify(note);
    } catch (error) {
        console.log(error);
    }
};


export const get_candidate_notes = async (parent_id: string) => {
    try {
        await mongodb();
        const notes = await Note.find({note_parent_id: parent_id});
        return JSON.stringify(notes);
    } catch (error) {
        console.log(error);
    }
};

export const get_application_notes = async ({parent_id, limit, offset}: { parent_id: string, limit: number, offset: number }) => {
    try {
        await mongodb();

        const completeNotes: any[] = [];

        const notes = await Note.find({note_parent_id: parent_id}).limit(limit).skip(offset).sort({created_at: -1});
        const total = await Note.countDocuments({note_parent_id: parent_id});

        for (const note of notes) {
            const copy = {...note._doc};
            const user = await db.select().from(usersTable).where(eq(usersTable.id, note.created_by))
            copy.user = user[0];
            completeNotes.push(copy);
        };

        return JSON.stringify({notes: completeNotes, total});
    } catch (error) {
        console.log(error);
        return JSON.stringify({notes: [], total: 0});
    }
};

export const update_note = async (note_id: string, data: any) => {
    try {
        await mongodb();
        const note = await Note.findByIdAndUpdate(note_id, data);
        return note;
    } catch (error) {
        console.log(error);
    }
};

export const delete_note = async (note_id: string) => {
    try {
        await mongodb();
        const note = await Note.findByIdAndDelete(note_id);
        return note;
    } catch (error) {
        console.log(error);
    }
};
