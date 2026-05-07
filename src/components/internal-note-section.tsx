"use client"

import { MessageSquare } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import CreateNoteModal from "@/components/modal/create-note-modal";
import { NoteType } from "@/types";
import { get_application_notes } from "@/server/queries/mongo/note";

type Props = {
    parent_type: string;
    parent_id: number | undefined;
    selectedId: number | undefined;
}

const InternalNoteSection = ({ parent_type, parent_id, selectedId }: Props) => {
    const [internalNotes, setInternalNotes] = useState<{ notes: NoteType[] }>({ notes: [] });
    const [isOpen, setIsOpen] = useState(false);


    useEffect(() => {
        const fetchInternalNotes = async () => {
            if (selectedId) {
                const internalNotes = await get_application_notes({ id: selectedId, limit: 10, offset: 0 })
                setInternalNotes(JSON.parse(internalNotes))
            }
        }
        fetchInternalNotes();
    }, [parent_id, selectedId]);

    return (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-4">
                <h3 className="font-bold flex items-center gap-2 text-foreground uppercase tracking-widest">
                    <MessageSquare className="w-4 h-4 text-foreground/30" />
                    Job Notes
                </h3>
                <span
                    className="bg-foreground/5 text-foreground/40 px-1.5 py-0.5 rounded text-[10px] font-bold"
                >
                    {internalNotes.notes?.length || 0}
                </span>
                <Button variant="ghost" className="ml-auto text-[10px] font-bold text-foreground/40 uppercase tracking-widest hover:text-primary hover:bg-transparent transition-colors" onClick={() => setIsOpen(!isOpen)}>
                    Add note
                </Button>
            </div>

            <div className="space-y-4">
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {internalNotes.notes && internalNotes.notes.length > 0 ? (
                        internalNotes.notes.map((note, index: number) => (
                            <div key={index} className="bg-foreground/5 border border-foreground/5 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-foreground/60">{note.author}</p>
                                    <p className="text-[10px] font-bold text-foreground/30">{new Date(note.created_at).toLocaleDateString()}</p>
                                </div>
                                <p className="text-xs text-foreground/60 font-medium leading-relaxed">
                                    {note.text}
                                </p>
                                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest pt-2">
                                    {note.type}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-foreground/40 text-center py-4 italic">No internal notes yet.</p>
                    )}
                </div>
            </div>

            <CreateNoteModal parent_id={parent_id as number} parent_type={parent_type} isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
    )
};

export default InternalNoteSection;
