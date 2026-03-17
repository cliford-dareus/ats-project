'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BriefcaseBusiness, Loader2, Sparkles, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CandidatesResponseType, JobResponseType } from '@/types';
import { create_application_action } from '@/server/actions/application_actions';
import UseDropZone from "@/components/use-drop-zone";
import { useTransition } from 'react';
import { candidateForm } from '@/zod';
import type { z } from 'zod';

type FormData = z.infer<typeof candidateForm>;

const CreateApplicationModal = ({
    job,
    candidates,
}: {
    job: JobResponseType[];
    candidates: CandidatesResponseType[];
}) => {
    const [isExistingCandidate, setIsExistingCandidate] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<CandidatesResponseType | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFileSelected, setIsFileSelected] = useState<boolean>(false);

    const onDrop = useCallback((state: boolean) => {
        setIsFileSelected(state);
    }, []);

    const form = useForm<FormData>({
        resolver: zodResolver(candidateForm),
    });

    const filteredCandidates = useMemo(() => {
        if (!searchTerm) return candidates;
        return candidates.filter((c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [candidates, searchTerm]);

    const onSubmit = async (data: FormData) => {
        const payload = isExistingCandidate
            ? { ...data, candidate: data.candidate, candidate_info: undefined }
            : { ...data, candidate: null };

        const response = await create_application_action(payload);
        console.log(response);
    };

    const handleCandidateSelect = (candidate: CandidatesResponseType) => {
        setSelectedCandidate(candidate);
        form.setValue('candidate', String(candidate.id));
        setSearchTerm(''); // clear search after selection
    };

    return (
        <>
            <DialogHeader className="flex flex-row gap-4 items-center">
                <div
                    className="flex aspect-square w-12 h-12 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <BriefcaseBusiness size={24} />
                </div>
                <div>
                    <DialogTitle className="text-2xl uppercase">Create Application</DialogTitle>
                    <DialogDescription>Quickly add a candidate to a job</DialogDescription>
                </div>
            </DialogHeader>

            <Separator />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* === Toggle: Existing or New Candidate === */}
                    <div className="flex items-center justify-between">
                        <FormLabel className="text-base">Candidate already exists in database?</FormLabel>
                        <Switch
                            checked={isExistingCandidate}
                            onCheckedChange={setIsExistingCandidate}
                        />
                    </div>

                    {/* ====================== EXISTING CANDIDATE ====================== */}
                    {isExistingCandidate ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Input
                                    placeholder="Search candidate..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />

                                {searchTerm && (
                                    <div
                                        className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-80 overflow-auto">
                                        {filteredCandidates.length === 0 ? (
                                            <div className="p-4 text-muted-foreground">No candidates found</div>
                                        ) : (
                                            filteredCandidates.map((candidate) => (
                                                <div
                                                    key={candidate.id}
                                                    className="flex items-center justify-between px-4 py-3 hover:bg-muted cursor-pointer border-b last:border-none"
                                                    onClick={() => handleCandidateSelect(candidate)}
                                                >
                                                    <span className="font-medium">{candidate.name}</span>
                                                    <Badge variant="secondary">{candidate.status}</Badge>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedCandidate && (
                                <div className="bg-muted/50 p-4 rounded-lg flex items-center gap-3">
                                    <div className="text-sm font-medium">Selected:</div>
                                    <div className="font-semibold">{selectedCandidate.name}</div>
                                    <Badge>{selectedCandidate.status}</Badge>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ====================== NEW CANDIDATE ====================== */
                        <>
                            <div className="bg-brand-50 border border-brand-100 rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Sparkles className="w-12 h-12 text-brand-600" />
                                </div>
                                <h4 className="text-brand-900 font-bold mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    AI Auto-fill
                                </h4>
                                <p className="text-brand-700 text-sm mb-6 leading-relaxed">Upload your resume and let our AI extract your details automatically.</p>

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
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? "Extracting..." : "Extract"}
                                    </Button>
                                )}

                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="candidate_info.first_name"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-4 justify-between">
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="w-[260px]"
                                                    placeholder="John"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="candidate_info.last_name"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-4 justify-between">
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="w-[260px]"
                                                    placeholder="Doe"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="candidate_info.email"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-4 justify-between">
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="w-[260px]"
                                                    placeholder="john@example.com"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="candidate_info.phone"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-4 justify-between">
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="w-[260px]"
                                                    placeholder="+1 555 555 5555"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="candidate_info.location"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-4 justify-between">
                                            <FormLabel>Address</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="w-[260px]"
                                                    placeholder="City, State"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </>
                    )}
                </form>
            </Form>
        </>
    )
};

export default CreateApplicationModal;
