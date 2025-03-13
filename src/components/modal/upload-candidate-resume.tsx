"use client";

import React, {useCallback, useEffect, useState} from 'react';
import {Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Plus} from "lucide-react";
import UseDropZone from "@/components/use-drop-zone";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useForm} from "react-hook-form";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {create_candidate_action} from "@/server/actions/candidates-actions";
import {ExtractResponseType} from "@/types";
import {newCandidateForm} from "@/zod";

const UploadCandidateResume = () => {
    const [resumePath, setResumePath] = useState<string>();
    const [state, setState] = useState<boolean>(false);
    const [extractedText, setExtractedText] = useState<ExtractResponseType>();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof newCandidateForm>>({
        resolver: zodResolver(newCandidateForm),
        defaultValues: {
            name: extractedText?.Name || '',
            email: extractedText?.['Contact Information']?.Email || '',
            phone: extractedText?.['Contact Information']?.Phone || '',
            location: extractedText?.['Contact Information']?.Location || '',
        },
    });

    const onDrop = useCallback((state: boolean) => {
        setState(state);
    }, []);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
    
        const formData = new FormData(e.currentTarget);
        try {
            const result = await fetch('/api/resume', {
                method: 'POST',
                body: formData
            });
            const rawResponse = await result.json();
            const jsonString = rawResponse.result
                .replace(/```(json)?/g, '')
                .trim();
            const parsedData = JSON.parse(jsonString);
            setResumePath(rawResponse.resumeUrlPath);
            setExtractedText(parsedData);
        } catch (e) {
            console.error('Error processing resume:', e);
            setState(false);
        } finally {
            setLoading(false);
        }
    };

    const onSave = async (data: z.infer<typeof newCandidateForm>) => {
        try {
            await create_candidate_action({...data, resume: resumePath!});
            // Navigate to the new candidate page
        } catch (e) {
            console.log(e);
        }
    };

    // const onCancel = () => {
    //     setExtractedText(undefined);
    //     setResumePath('')
    //     setState(false);
    // };

    useEffect(() => {
        form.reset({
            name: extractedText?.Name || '',
            email: extractedText?.['Contact Information']?.Email || '',
            phone: extractedText?.['Contact Information']?.Phone || '',
            location: extractedText?.['Contact Information']?.Location || '',
        });
    }, [extractedText, form]);

    return (
        <Dialog>
            <DialogTrigger>
                <div className="p-1 bg-blue-300 rounded cursor-pointer hover:bg-blue-400">
                    <Plus size={18}/>
                </div>
            </DialogTrigger>

            <DialogContent>
                {!extractedText ? <div className="max-w-xl w-full mx-auto mt-8 mb-16">
                    <div className="flex flex-col items-center">
                        <DialogTitle className="text-2xl">Import candidate</DialogTitle>
                        <DialogDescription>Select your import source</DialogDescription>
                    </div>

                    <div className="flex gap-16 mt-8">
                        <form className="w-[250px]" onSubmit={onSubmit}>
                            <UseDropZone name="my-file" onDrop={onDrop}/>
                            {!state ?
                                <div className="flex flex-col items-center mt-4 text-center">
                                    <h3 className="font-medium">Upload Resume</h3>
                                    <p className="text-sm text-slate-500 mt-2">Or <span
                                        className="text-blue-500">Create</span> candidate yourself, fill in and upload
                                        information manually. </p>
                                </div> :
                                <Button type="submit" disabled={loading}>Extract</Button>
                            }
                        </form>

                        <div className="w-[250px]">
                            <div className="h-[200px] border border-dashed rounded bg-muted">
                            </div>
                            <div className="flex flex-col items-center mt-4 text-center">
                                <h3 className="font-medium">Import Resume from other sources</h3>
                                <p className="text-sm text-slate-500 mt-2">Or <span
                                    className="text-blue-500">Create</span> candidate yourself, fill in and upload
                                    information manually. </p>
                            </div>
                        </div>
                    </div>
                </div> : (
                    <div className="max-w-xl w-full mx-auto mt-8 mb-16">
                        <div className="flex flex-col items-center">
                            <DialogTitle className="text-2xl">Extracted Resume</DialogTitle>
                            <DialogDescription>Extracted Resume</DialogDescription>
                        </div>

                        {extractedText && <div className="w-full border border-muted rounded p-4">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSave)} className="space-y-8">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="shadcn" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    This is your public display name.
                                                </FormDescription>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="shadcn" {...field}/>
                                                </FormControl>
                                                <FormDescription>
                                                    This is your public display name.
                                                </FormDescription>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Phone</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="shadcn" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    This is your public display name.
                                                </FormDescription>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Location</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="shadcn" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    This is your public display name.
                                                </FormDescription>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit">Submit</Button>
                                </form>
                            </Form>
                        </div>}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default UploadCandidateResume;