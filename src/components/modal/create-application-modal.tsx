'use client';

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {BriefcaseBusiness, FileText, Upload} from 'lucide-react';
import {Separator} from '@/components/ui/separator';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Badge} from '@/components/ui/badge';
import {CandidatesResponseType, JobListing} from '@/types';
import {create_application_action} from '@/server/actions/application_actions';
import {useTransition} from 'react';
import {applicationFormSchema} from '@/zod';
import type {z} from 'zod';

type FormData = z.infer<typeof applicationFormSchema>;

const CreateApplicationModal = ({
                                    job,
                                    candidates,
                                }: {
    job: JobListing;
    candidates: CandidatesResponseType[];
}) => {
    const [isExistingCandidate, setIsExistingCandidate] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<CandidatesResponseType | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(applicationFormSchema),
        defaultValues: {
            candidate_info: {first_name: "", last_name: "", email: "", phone: "", location: ""},
            job: job.job_id
        }
    });

    const filteredCandidates = useMemo(() => {
        if (!searchTerm) return candidates;
        return candidates.filter((c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [candidates, searchTerm]);

    const onSubmit = async (data: FormData) => {
        const payload = isExistingCandidate
            ? {...data, candidate: data.candidate, candidate_info: null}
            : {...data, candidate: null, file: {file_: file, file_type: "RESUME"}};

        await create_application_action(payload);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
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
                    <BriefcaseBusiness size={24}/>
                </div>
                <div>
                    <DialogTitle className="text-2xl uppercase">Create Application</DialogTitle>
                    <DialogDescription>Quickly add a candidate to a job</DialogDescription>
                </div>
            </DialogHeader>

            <Separator/>

                    {/* === Toggle: Existing or New Candidate === */}
                    <div className="flex items-center justify-between">
                        <span className="text-base">Candidate already exists in database?</span>
                        <Switch
                            checked={isExistingCandidate}
                            onCheckedChange={setIsExistingCandidate}
                        />
                    </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`
                                        border-2 border-dashed rounded-[24px] p-12 text-center cursor-pointer transition-all
                                        ${file ? 'border-brand-500 bg-brand-50/30' : 'border-zinc-200 hover:border-brand-400 hover:bg-zinc-50'}
                                    `}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept=".pdf,image/*"
                                    />
                                    <div className="flex flex-col items-center gap-4">
                                        <div
                                            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${file ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                                            {file ? <FileText className="w-8 h-8"/> : <Upload className="w-8 h-8"/>}
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-zinc-900">
                                                {file ? file.name : 'Drop resume here or click to upload'}
                                            </p>
                                            <p className="text-sm text-zinc-500 mt-1">Supports PDF and Images</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="candidate_info.first_name"
                                    render={({field}) => (
                                        <FormItem className="flex items-center gap-4 justify-between">
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="w-[260px]"
                                                    placeholder="John"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="candidate_info.last_name"
                                    render={({field}) => (
                                        <FormItem className="flex items-center gap-4 justify-between">
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="w-[260px]"
                                                    placeholder="Doe"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="candidate_info.email"
                                    render={({field}) => (
                                        <FormItem className="flex items-center gap-4 justify-between">
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="w-[260px]"
                                                    placeholder="john@example.com"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="candidate_info.phone"
                                    render={({field}) => (
                                        <FormItem className="flex items-center gap-4 justify-between">
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="w-[260px]"
                                                    placeholder="+1 555 555 5555"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="candidate_info.location"
                                    render={({field}) => (
                                        <FormItem className="flex items-center gap-4 justify-between">
                                            <FormLabel>Address</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="w-[260px]"
                                                    placeholder="City, State"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </>
                    )}
                    <Button type="submit">Apply</Button>
                </form>
            </Form>
        </>
    )
};

export default CreateApplicationModal;
