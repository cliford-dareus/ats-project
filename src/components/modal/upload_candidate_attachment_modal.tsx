import React, { useCallback, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Paperclip } from "lucide-react";
import { Button } from '../ui/button';
import UseDropZone from "@/components/use-drop-zone";
import { z } from "zod";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
    candidateId: number;
};

export const attachmentType = ["RESUME", "COVER_LETTER", "OFFER_LETTER", "OTHER"] as const;

export const AttachmentForm = z.object({
    file_name: z.string(),
    file_url: z.string(),
    candidate_id: z.number(),
    attachment_type: z.enum(attachmentType),
});

const AddCandidateAttachmentModal = ({candidateId}: Props) => {
    const [isFileSelected, setIsFileSelected] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [value, setValue] = useState<string>("");
    const [open, setOpen] = useState(false);

    const onDrop = useCallback((state: boolean) => {
        setIsFileSelected(state);
    }, []);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        formData.append("candidate_id", String(candidateId));
        formData.append("attachment_type", value);

        try {
            const result = await fetch("/api/upload/files", {
                method: "POST",
                body: formData,
            });
            const rawResponse = await result.json();
            console.log(rawResponse);
        } catch (error) {
            setError(`Error processing resume. Please try again. ${error}`);
            setIsFileSelected(false);
        } finally {
            setLoading(false);
        }
    };

  return (
    <Dialog>
         <DialogTrigger asChild>
            <Button className="flex items-center gap-2 text-sm" variant="ghost">
                <Paperclip size={18} />
                <p>Import Files</p>
            </Button>
        </DialogTrigger>

        <DialogContent className="max-w-xl">
            <div className="relative mx-auto flex gap-4 my-8 z-0">
                <form className="w-[250px] flex flex-col my-8" onSubmit={onSubmit}>
                    <UseDropZone name="my-file" onDrop={onDrop} />

                    <div className="flex flex-col items-center mt-4 text-center">
                        <DialogTitle className="font-medium">Attachment Upload</DialogTitle>
                        <p className="text-sm text-slate-500 mt-2">
                            Or{" "}
                            <span className="text-blue-500">Create</span> candidate
                            yourself, fill in and upload information manually.{" "}
                        </p>
                    </div>


                    <div className="absolute -top-10 -left-[136px] w-full z-50">
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-[200px] justify-between"
                                >
                                    {value
                                        ? attachmentType.find((type) => type === value)?.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
                                        : "Select file type..."}
                                <ChevronsUpDown className="opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search framework..." className="h-9" />
                                    <CommandList>
                                        <CommandEmpty>No framework found.</CommandEmpty>
                                        <CommandGroup>
                                            {attachmentType.map((type, i) => (
                                                <CommandItem
                                                            key={i}
                                                            value={type}
                                                            onSelect={(currentValue) => {
                                                                setValue(currentValue === value ? "" : currentValue)
                                                                setOpen(false)
                                                            }}
                                                        >
                                                            {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
                                                        <Check
                                                            className={cn("ml-auto",
                                                                value === type ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                       <div className="w-full flex items-center gap-4 absolute -bottom-10 -right-[215px]">
                            <Button>Cancel</Button>
                            <Button type="submit" disabled={loading || !isFileSelected}>
                                {loading ? "Uploading..." : "Upload"}
                            </Button>
                       </div>
                </form>
            </div>
        </DialogContent>
    </Dialog>
  )
};

export default AddCandidateAttachmentModal;
