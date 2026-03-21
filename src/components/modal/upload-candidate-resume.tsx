"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {CheckCircle2, Plus} from "lucide-react";
import UseDropZone from "@/components/use-drop-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { create_candidate_action } from "@/server/actions/candidates-actions";
import {Candidate} from "@/types";
import { newCandidateFormSchema } from "@/zod";
import { useRouter } from "next/navigation";
import {ScrollArea} from "@/components/ui/scroll-area";

const UploadCandidateResume = () => {
    const [resumePath, setResumePath] = useState<string>();
    const [isFileSelected, setIsFileSelected] = useState<boolean>(false);
    const [parsedData, setParsedData] = useState<Partial<Candidate> | null>(null);
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const form = useForm<z.infer<typeof newCandidateFormSchema>>({
        resolver: zodResolver(newCandidateFormSchema),
        defaultValues: { name: "", email: "", phone: "", location: "" },
    });

    const onDrop = useCallback((state: boolean) => {
        setIsFileSelected(state);
    }, []);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        try {
            const result = await fetch("/api/upload/resume", {
                method: "POST",
                body: formData,
            });
            const rawData = await result.json();
            setResumePath(rawData?.resumeUrlPath);
            setParsedData(rawData?.data);
            setReady(true);
        } catch (error) {
            setError(`Error processing resume. Please try again. ${error}`);
            setIsFileSelected(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data: z.infer<typeof newCandidateFormSchema>) => {
        if (data.email === "" || data.name === "" || data.phone === "" || data.location === "" || resumePath === "") {
            setError("Please fill in all required fields.");
            return;
        };

        try {
            await create_candidate_action({ ...data, resume: resumePath! });
            form.reset();
            setReady(false)
            router.push("/candidates"); // or wherever you want to go
        } catch (error) {
            setError(`Failed to save candidate. Please try again. ${error}`);
        }
    };

    useEffect(() => {
        form.reset({
            name: parsedData?.name || "",
            email: parsedData?.email || "",
            phone: parsedData?.phone || "",
            location: parsedData?.location || "",
        });
    }, [ready]);

    // Optional: Cancel handler
    // const onCancel = () => {
    //   setExtractedText(undefined);
    //   setResumePath('')
    //   setIsFileSelected(false);
    // };

    return (
        <Dialog>
            <DialogTrigger>
                <div className="p-1 bg-blue-300 rounded cursor-pointer hover:bg-blue-400">
                    <Plus size={18} />
                </div>
            </DialogTrigger>

            <DialogContent className="">
                {error && (
                    <div className="mb-4 text-red-500 text-center">{error}</div>
                )}
                {!parsedData ? (
                    <div className="max-w-xl w-full mx-auto mt-8 mb-16">
                        <div className="flex flex-col items-center">
                            <DialogTitle className="text-2xl">Import candidate</DialogTitle>
                            <DialogDescription>Select your import source</DialogDescription>
                        </div>

                        <div className="flex gap-16 mt-8">
                            <form className="w-[250px]" onSubmit={onSubmit}>
                                <UseDropZone name="my-file" onDrop={onDrop} />
                                {!isFileSelected ? (
                                    <div className="flex flex-col items-center mt-4 text-center">
                                        <h3 className="font-medium">Upload Resume</h3>
                                        <p className="text-sm text-slate-500 mt-2">
                                            Or{" "}
                                            <span className="text-blue-500">Create</span> candidate
                                            yourself, fill in and upload information manually.{" "}
                                        </p>
                                    </div>
                                ) : (
                                    <Button type="submit" disabled={loading}>
                                        {loading ? "Extracting..." : "Extract"}
                                    </Button>
                                )}
                            </form>

                            <div className="w-[250px]">
                                <div className="h-[200px] border border-dashed rounded bg-muted"></div>
                                <div className="flex flex-col items-center mt-4 text-center">
                                    <h3 className="font-medium">
                                        Import Resume from other sources
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-2">
                                        Or{" "}
                                        <span className="text-blue-500">Create</span> candidate
                                        yourself, fill in and upload information manually.{" "}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <ScrollArea className="max-w-xl w-full mx-auto mt-8 mb-16 max-h-[calc(100vh_-_200px)]">
                        <div className="flex flex-col items-center">
                            <DialogTitle className="text-2xl">Extracted Resume</DialogTitle>
                            <DialogDescription>Extracted Resume</DialogDescription>
                        </div>

                        <div className="w-full border border-muted rounded p-4">
                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(handleSave)}
                                    className="space-y-8"
                                >
                                    {loading || !ready ? (
                                        <div className="text-center">
                                            {loading ? "Processing..." : "Preparing form..."}
                                        </div>
                                    ) : (
                                        <>
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Name" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            This is your public display name.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Email" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            This is your public display name.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Phone</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Phone" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            This is your public display name.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="location"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Location</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Location" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            This is your public display name.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Skills</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {parsedData?.skills?.map((skill, i) => (
                                                        <span key={i} className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold border border-brand-100">
                          {skill}
                        </span>
                                                    ))}
                                                    {(!parsedData?.skills || parsedData?.skills.length === 0) && <span className="text-sm text-zinc-400 italic">No skills extracted</span>}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Work Experience</label>
                                                <div className="space-y-4">
                                                    {parsedData?.experience?.map((exp, i) => (
                                                        <div key={i} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="font-bold text-zinc-900">{exp.role}</p>
                                                                    <p className="text-xs text-zinc-500 font-medium">{exp.company}</p>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-zinc-400">{exp.period}</span>
                                                            </div>
                                                            <p className="text-xs text-zinc-600 leading-relaxed">{exp.description}</p>
                                                        </div>
                                                    ))}
                                                    {(!parsedData?.experience || parsedData?.experience.length === 0) && <p className="text-sm text-zinc-400 italic">No experience extracted</p>}
                                                </div>
                                            </div>

                                            <div className="pt-4 flex gap-4">
                                                <button
                                                    onClick={() => setParsedData(null)}
                                                    className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                                                >
                                                    Back to Upload
                                                </button>
                                                <button
                                                    className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Save Candidate
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </form>
                            </Form>
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default UploadCandidateResume;
