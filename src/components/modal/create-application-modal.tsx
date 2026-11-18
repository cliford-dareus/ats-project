'use client';

import React, { useMemo, useRef, useState } from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BriefcaseBusiness, FileText, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CandidatesResponseType, JobListingType } from '@/types';
import { create_application_for_candidate_action } from '@/server/actions/application_actions';
import { create_candidate_action } from '@/server/actions/candidates-actions';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

// Quick-add only collects the fields a recruiter types by hand. This is
// deliberately NOT applicationFormSchema — that is the full public apply
// form (address, work history, education). New candidates are created via
// create_candidate_action and the resume is uploaded after, via /api/upload/files.
const quickAddSchema = z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    location: z.string().min(2, "Location is required"),
});

type QuickAddData = z.infer<typeof quickAddSchema>;

const CreateApplicationModal = ({
    job,
    candidates,
}: {
    job: JobListingType;
    candidates: CandidatesResponseType[];
}) => {
    const router = useRouter();
    const [isExistingCandidate, setIsExistingCandidate] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<CandidatesResponseType | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const form = useForm<QuickAddData>({
        resolver: zodResolver(quickAddSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            location: "",
        }
    });

    const filteredCandidates = useMemo(() => {
        if (!searchTerm) return candidates;
        return candidates.filter((c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [candidates, searchTerm]);

    const submitExisting = async () => {
        if (!selectedCandidate) {
            setError("Select a candidate first.");
            return;
        }
        const result = await create_application_for_candidate_action({
            jobId: job.job_id,
            candidateId: selectedCandidate.id,
        });
        if (!result.success) {
            setError(result.message);
            return;
        }
        setSuccess(true);
        router.refresh();
    };

    const submitNew = async (data: QuickAddData) => {
        // 1. Create the candidate (org/subdomain come from the session).
        const created = await create_candidate_action({
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            location: data.location,
        });
        if (!created || "error" in created) {
            setError(created && "error" in created ? created.message : "Failed to create candidate.");
            return;
        }
        const candidateId = created.id;

        // 2. Upload the resume if one was picked (best-effort — the
        // application is still created if the upload fails).
        if (file) {
            const upload = new FormData();
            upload.append("my-file", file);
            upload.append("candidate_id", String(candidateId));
            upload.append("attachment_type", "RESUME");
            try {
                const res = await fetch("/api/upload/files", { method: "POST", body: upload });
                if (!res.ok) {
                    console.warn("[Add Applicant] resume upload failed, continuing without it");
                }
            } catch (e) {
                console.warn("[Add Applicant] resume upload failed, continuing without it", e);
            }
        }

        // 3. Create the application at the Applied stage.
        const result = await create_application_for_candidate_action({
            jobId: job.job_id,
            candidateId,
        });
        if (!result.success) {
            setError(result.message);
            return;
        }
        setSuccess(true);
        router.refresh();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setSubmitting(true);
        try {
            if (isExistingCandidate) {
                await submitExisting();
            } else {
                await form.handleSubmit(submitNew)();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
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

            {/* === Toggle: Existing or New Candidate === */}
            <div className="flex items-center justify-between">
                <span className="text-base">Candidate already exists in database?</span>
                <Switch
                    checked={isExistingCandidate}
                    onCheckedChange={setIsExistingCandidate}
                />
            </div>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    Application created successfully.
                </p>
            )}

            <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-6">
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
                                            {file ? <FileText className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
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
                                    name="firstName"
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
                                    name="lastName"
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
                                    name="email"
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
                                    name="phone"
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
                                    name="location"
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
                    <Button type="submit" disabled={submitting}>
                        {submitting ? "Adding…" : "Apply"}
                    </Button>
                </form>
            </Form>
        </>
    )
};

export default CreateApplicationModal;
