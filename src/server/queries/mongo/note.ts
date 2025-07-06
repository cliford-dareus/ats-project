"use server";

import mongodb from "@/lib/mongodb";
import Note from "@/models/notes";


export const create_candidate_note = async (data: {candidate_id?: number | null; content: string; created_by: string; application_id?: number | null}) => {
    try {
        await mongodb();

        if (!data.candidate_id && !data.application_id) {
            throw new Error("Candidate id or application id is required");
        };

        const note = await Note.create(data);
        return note;
    } catch (error) {
        console.log(error);
    }
};


export const get_candidate_notes = async (candidate_id: number) => {
    try {
        await mongodb();
        const notes = await Note.find({candidate_id});
        return notes;
    } catch (error) {
        console.log(error);
    }
};

export const get_application_notes = async (application_id: number) => {
    try {
        await mongodb();
        const notes = await Note.find({application_id});
        return notes;
    } catch (error) {
        console.log(error);
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
