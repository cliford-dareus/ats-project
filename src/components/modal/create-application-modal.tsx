'use client';

import React, {useMemo, useState} from 'react';
import {DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {BriefcaseBusiness} from 'lucide-react';
import {Separator} from '@/components/ui/separator';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {CandidatesResponseType, JobResponseType} from '@/types';
import {create_application_action} from '@/server/actions/application_actions';
import {candidateForm} from '@/zod';
import type {z} from 'zod';

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
            ? {...data, candidate: data.candidate, candidate_info: undefined}
            : {...data, candidate: null};

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
                    <BriefcaseBusiness size={24}/>
                </div>
                <div>
                    <DialogTitle className="text-2xl uppercase">Create Application</DialogTitle>
                    <DialogDescription>Quickly add a candidate to a job</DialogDescription>
                </div>
            </DialogHeader>

            <Separator/>

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
                    )}
                </form>
            </Form>
        </>
    )
};

export default CreateApplicationModal;