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
import {candidateForm} from "@/zod";
import {CACHE_TAGS, revalidateDbCache} from "@/lib/cache";


export const create_note = async (unsafeData: z.infer<typeof noteSchema>) => {
    try {
        await mongodb();

        const {userId} = await auth();
        const {success, data} = await noteSchema.spa(unsafeData);
        const canCreate = await canCreateJob(userId);

        const user = await db.select().from(usersTable).where(eq(usersTable.id, userId!))
        if (!user || !success ||  !canCreate) {
            return {error: true, message: "There was an error creating your the notes"}
        };

        await Note.create({...data, created_by: user[0].id});

        revalidateDbCache({
            tag: CACHE_TAGS.applications,
        });

        return "Note created successfully...";
    } catch (error) {
        console.log(error);
        return "Failed to create note..."
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

export const get_application_notes = async ({id, limit, offset}: { id: number, limit: number, offset: number }) => {
    try {
        await mongodb();
        const note_id = 'application' + "_" + id

        const completeNotes: any[] = [];

        const notes = await Note.find({note_id: note_id}).limit(limit).skip(offset).sort({created_at: -1});
        for (const note of notes) {
            const copy = {...note._doc};
            const user = await db.select().from(usersTable).where(eq(usersTable.id, note.created_by))
            copy.author = user[0].name;
            completeNotes.push(copy);
        };

        return JSON.stringify({error: false, notes: completeNotes});
    } catch (error) {
        console.log(error);
        return JSON.stringify({error: true, notes: []});
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
