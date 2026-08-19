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
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";
import Thread from "@/models/threads";

type CompletedNotes = {
    note_text: string;
    note_type: string;
    note_parent_id: string;
    created_by: string;
    author: string;
    type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
};

export const create_note = async (unsafeData: z.infer<typeof noteSchema>) => {
    try {
        await mongodb();

        const { userId, orgId } = await auth();
        const { success, data } = await noteSchema.spa(unsafeData);
        const canCreate = await canCreateJob(userId);

        const user = await db.select().from(usersTable).where(eq(usersTable.id, userId!))
        if (!user || !success || !canCreate) {
            return { error: true, message: "There was an error creating your the notes" }
        };

        const createdNote = await Note.create({ ...data, channel: 'Internal Note', created_by: user[0].id });

        // check if the candidate alreagy has a thread with the organization
        const existingThread = await Thread.findOne({
            organization: orgId,
            candidate_id: data.candidate_id,
        });

        if (existingThread) {
            // add the note to the existing thread
            await Thread.updateOne(
                { _id: existingThread._id },
                { $push: { notes: createdNote._id } },
            );

        } else {
            // create a new thread
            await Thread.create({
                organization: orgId,
                candidateId: data.candidate_id,
                notes: [createdNote._id],
            });
        }

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
        const completeNotes: CompletedNotes[] = [];

        const notes = await Note.find({ note_parent_id: parent_id });
        for (const note of notes) {
            const copy = { ...note._doc };
            completeNotes.push(copy);
        }
        return JSON.stringify(completeNotes);
    } catch (error) {
        console.log(error);
    }
};

export const get_application_notes = async ({ id, limit, offset }: { id: number, limit: number, offset: number }) => {
    try {
        await mongodb();
        const note_id = 'application' + "_" + id

        const completeNotes: CompletedNotes[] = [];

        const notes = await Note.find({ note_id: note_id }).limit(limit).skip(offset).sort({ created_at: -1 });
        for (const note of notes) {
            const copy = { ...note._doc };
            const user = await db.select().from(usersTable).where(eq(usersTable.id, note.created_by))
            copy.author = user[0].name;
            completeNotes.push(copy);
        };

        return JSON.stringify({ error: false, notes: completeNotes });
    } catch (error) {
        console.log(error);
        return JSON.stringify({ error: true, notes: [] });
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
