"use client"

import {MessageSquare} from "lucide-react";
import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import CreateNoteModal from "@/components/modal/create-note-modal";
import {NoteType} from "@/types";

type Props = {
    data: { notes: NoteType[] };
    parent_type: string;
    parent_id: number;
}

const InternalNoteSection = ({data, parent_type, parent_id}: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-zinc-400"/>
                    Job Notes
                </h3>
                <span
                    className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 px-2 py-0.5 rounded"
                >
                    {data.notes?.length || 0}
                </span>
                <Button variant="ghost" className="ml-auto" onClick={() => setIsOpen(!isOpen)}>
                    Add note
                </Button>
            </div>

            <div className="space-y-4">
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {data.notes && data.notes.length > 0 ? (
                        data.notes.map((note, index: number) => (
                            <div key={index} className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-zinc-900">{note.author}</span>
                                    <span
                                        className="text-[10px] text-zinc-400">{new Date(note.updated_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-zinc-600 leading-relaxed">{note.text}</p>
                                <span>{note.type}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-zinc-400 text-center py-4 italic">No internal notes yet.</p>
                    )}
                </div>
            </div>

            <CreateNoteModal parent_id={parent_id} parent_type={parent_type} isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
    )
};

export default InternalNoteSection;