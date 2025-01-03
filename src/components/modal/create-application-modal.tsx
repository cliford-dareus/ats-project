'use client'

import React, {useEffect, useMemo, useState} from 'react';
import {DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {BriefcaseBusiness, ChevronDownCircle, Command} from "lucide-react";
import {Separator} from "@/components/ui/separator";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {Badge} from "@/components/ui/badge";
import {motion} from "motion/react";
import {checkFormStatus, cn} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {Select, SelectContent, SelectItem, SelectTrigger} from "@/components/ui/select";
import {candidatesResponseType, JobResponseType} from "@/types/job-listings-types";
import {create_application_action} from "@/server/actions/application_actions";
import {candidateForm} from "@/schema";

const STEPS = [
    {step: 1, status: 'In-Complete', open: true},
    {step: 2, status: 'In-Complete', open: false},
];

const CreateApplicationModal = ({job, candidates}: { job: JobResponseType[], candidates: candidatesResponseType[] }) => {
    const [isOpen, setIsOpen] = useState<{ step: number, status: string, open: boolean }[]>(STEPS);
    const [selectedCandidate, setCandidateSelected] = useState<candidatesResponseType | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [isInDataBase, setIsInDataBase] = useState(false);
    const form = useForm<z.infer<typeof candidateForm>>({
        resolver: zodResolver(candidateForm),
        defaultValues: {}
    });

    const onsubmit = async (data: z.infer<typeof candidateForm>) => {
        if (isInDataBase) {
            console.log({...data, candidate_info: null, candidate_file: null});
        } else {
            const response = await create_application_action({...data, candidate: null})
            console.log(response);
        }
    };

    useEffect(() => {
        form.setValue("candidate", String(selectedCandidate?.id));
        setSearchTerm('')
    }, [selectedCandidate, form.setValue]);

    const filterData = useMemo(() => {
        if (candidates && searchTerm) {
            return candidates.filter((candidate) => candidate.name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()));
        }
        return candidates;
    }, [candidates, searchTerm]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setSearchTerm(e.target.value);
    };

    const changeForm = (index: number) => {
        console.log(index);
        setIsOpen((prevIsOpen) =>
            prevIsOpen.map((s) => {
                if (s.step === index) {
                    return {...s, open: true};
                }
                if (s.step === index - 1) {
                    const trigger = index - 1 === 0 || index - 1 === 1 ? "candidate_info" : 'candidate_file'
                    const status = checkFormStatus(trigger, form, trigger)
                    return {
                        ...s,
                        open: false,
                        status: !status ? "In-Complete" : "Complete",
                    };
                }
                return {...s, open: false};
            })
        );
    };

    return (
        <>
            <DialogHeader className="flex flex-row gap-4 items-center">
                <div
                    className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Command/>
                </div>
                <div className="">
                    <DialogTitle className="text-2xl">Create Candidate</DialogTitle>
                    <DialogDescription>Complete each step to create a candidate!</DialogDescription>
                </div>
            </DialogHeader>
            <Separator/>
            <div>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onsubmit)}
                        className="w-full flex flex-col gap-4 items-center"
                    >
                        <div className="flex items-center gap-4 w-full">
                            <FormLabel htmlFor="candidate_info">Candidate Exist</FormLabel>
                            <Switch
                                checked={isInDataBase}
                                onCheckedChange={() => setIsInDataBase(!isInDataBase)}
                            />
                        </div>
                        {!isInDataBase && (
                            <>
                                {/* CANDIDATE INFO */}
                                <div className="flex gap-4 w-full">
                                    <div
                                        className="w-[60px] h-[50px] border rounded-full flex items-center justify-center ">
                                        <BriefcaseBusiness size={24}/>
                                    </div>
                                    <Collapsible
                                        className="w-full flex gap-4 flex-col"
                                        open={isOpen[0].open}
                                        onOpenChange={() => {
                                            if (!isOpen[0].open) changeForm(1)
                                        }}

                                    >
                                        <CollapsibleTrigger>
                                            <div className="flex items-center justify-between h-[50px]">
                                                <div className="flex flex-col items-start">
                                                    <h2 className="text-lg font-semibold leading-none tracking-tight">Candidate
                                                        Information</h2>
                                                    <p className="text-sm text-muted-foreground">Provided required
                                                        info</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <ChevronDownCircle size={24}/>
                                                </div>
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div
                                                className="p-4 border flex flex-col gap-2 rounded-lg"
                                            >
                                                <FormField
                                                    disabled={isInDataBase}
                                                    control={form.control}
                                                    name="candidate_info.first_name"
                                                    render={({field}) => (
                                                        <FormItem
                                                            className="flex items-center gap-4 justify-between">
                                                            <FormLabel>First Name</FormLabel>
                                                            <FormControl>
                                                                <Input className="w-[260px]"
                                                                       placeholder="shadcn" {...field} />
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    disabled={isInDataBase}
                                                    control={form.control}
                                                    name="candidate_info.last_name"
                                                    render={({field}) => (
                                                        <FormItem
                                                            className="flex items-center gap-4 justify-between">
                                                            <FormLabel>Last Name</FormLabel>
                                                            <FormControl>
                                                                <Input className="w-[260px]"
                                                                       placeholder="Acme" {...field} />
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    disabled={isInDataBase}
                                                    control={form.control}
                                                    name="candidate_info.email"
                                                    render={({field}) => (
                                                        <FormItem
                                                            className="flex items-center gap-4 justify-between">
                                                            <FormLabel>Email</FormLabel>
                                                            <FormControl>
                                                                <Input className="w-[260px]"
                                                                       placeholder="Acme" {...field} />
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    disabled={isInDataBase}
                                                    control={form.control}
                                                    name="candidate_info.phone"
                                                    render={({field}) => (
                                                        <FormItem
                                                            className="flex items-center gap-4 justify-between">
                                                            <FormLabel>Phone</FormLabel>
                                                            <FormControl>
                                                                <Input className="w-[260px]"
                                                                       placeholder="Acme" {...field} />
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    disabled={isInDataBase}
                                                    control={form.control}
                                                    name="candidate_info.location"
                                                    render={({field}) => (
                                                        <FormItem
                                                            className="flex items-center gap-4 justify-between">
                                                            <FormLabel>Address</FormLabel>
                                                            <FormControl>
                                                                <Input className="w-[260px]"
                                                                       placeholder="Acme" {...field} />
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />

                                                <Button onClick={() => changeForm(2)} className="self-end px-16">
                                                    Next
                                                </Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                                {/* CANDIDATE FILE */}
                                <div className="flex gap-4 w-full">
                                    <div
                                        className="w-[60px] h-[50px] border rounded-full flex items-center justify-center ">
                                        <BriefcaseBusiness size={24}/>
                                    </div>
                                    <Collapsible
                                        className="w-full flex gap-4 flex-col"
                                        open={isOpen[1].open}
                                        onOpenChange={() => {
                                            if (!isOpen[1].open) changeForm(2)
                                        }}

                                    >
                                        <CollapsibleTrigger>
                                            <div className="flex items-center justify-between h-[50px]">
                                                <div className="flex flex-col items-start">
                                                    <h2 className="text-lg font-semibold leading-none tracking-tight">Candidate
                                                        File</h2>
                                                    <p className="text-sm text-muted-foreground">Provided required
                                                        info</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <ChevronDownCircle size={24}/>
                                                </div>
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="p-4 border flex flex-col gap-2 rounded-lg">
                                                <FormField
                                                    disabled={!isInDataBase}
                                                    // control={form.control}
                                                    name="candidate_file.resume"
                                                    render={() => (
                                                        <FormItem
                                                            className="flex items-center gap-4 justify-between">
                                                            <FormLabel>Resume</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="file"
                                                                    className="w-[260px]"
                                                                    placeholder="shadcn"
                                                                />
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    disabled={!isInDataBase}
                                                    control={form.control}
                                                    name="candidate_file.cover_letter"
                                                    render={() => (
                                                        <FormItem
                                                            className="flex items-center gap-4 justify-between">
                                                            <FormLabel>Cover Letter</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="file"
                                                                    className="w-[260px]"
                                                                    placeholder="Acme"
                                                                />
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />

                                                <Button onClick={() => changeForm(2)} className="self-end px-16">
                                                    Next
                                                </Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            </>)
                        }
                        {isInDataBase &&
                            <>
                                {/* CANDIDATE SELECT */}
                                <div className="flex gap-4 w-full">
                                    <div
                                        className="w-[60px] h-[50px] border rounded-full flex items-center justify-center ">
                                        <BriefcaseBusiness size={24}/>
                                    </div>
                                    <Collapsible
                                        open={isInDataBase}
                                        className="w-full flex gap-4 flex-col"
                                    >
                                        <CollapsibleTrigger>
                                            <div className="flex items-center justify-between h-[50px]">
                                                <div className="flex flex-col items-start">
                                                    <h2 className="text-lg font-semibold leading-none tracking-tight">Choose
                                                        a Candidate</h2>
                                                    <p className="text-sm text-muted-foreground">Provided required
                                                        info</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <ChevronDownCircle size={24}/>
                                                </div>
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <motion.div
                                                initial={{height: 0, opacity: 0}}
                                                animate={{height: "auto", opacity: 1}}
                                                exit={{height: 0, opacity: 0}}
                                                transition={{duration: 0.2, ease: "easeInOut"}}
                                                className="p-4 border flex flex-col gap-2 rounded-lg"
                                            >
                                                {selectedCandidate ? (
                                                    <div
                                                        className="flex items-center gap-2 overflow-hidden w-[90%]">
                                                        <div
                                                            className="cursor-pointer rounded-md bg-slate-200 px-2 text-sm py-0.5">
                                                            {selectedCandidate.name}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>Select or Search a Candidate</div>
                                                )}

                                                <>
                                                    <div className="relative">
                                                        <FormField
                                                            name="candidate"
                                                            render={({}) => (
                                                                <FormItem
                                                                    className="flex items-center gap-4 justify-between">
                                                                    <FormLabel>Search Candidate</FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            value={searchTerm}
                                                                            onChange={handleSearch}
                                                                            className="w-[260px]"
                                                                            placeholder="shadcn"/>
                                                                    </FormControl>
                                                                    <FormMessage/>
                                                                </FormItem>
                                                            )}
                                                        />
                                                        {searchTerm &&
                                                            <div className="absolute bg-white w-full p-4 border top-12 rounded">
                                                                <>
                                                                    {candidates && filterData?.map((candidate) => (
                                                                        <div
                                                                            className="flex justify-between cursor-pointer items-center rounded border px-4 text-sm py-2 hover:bg-muted mt-1"
                                                                            key={candidate.id}
                                                                            onClick={() => setCandidateSelected(candidate)}
                                                                        >
                                                                            <h3>{candidate.name}</h3>
                                                                            <Badge
                                                                                className="mr-4">{candidate.status}</Badge>
                                                                        </div>
                                                                    ))}
                                                                </>
                                                            </div>}
                                                    </div>

                                                    {/*<FormField*/}
                                                    {/*    control={form.control}*/}
                                                    {/*    name="candidate"*/}
                                                    {/*    render={({field}) => (*/}
                                                    {/*        <FormItem*/}
                                                    {/*            className="flex items-center gap-4 justify-between">*/}
                                                    {/*            <FormLabel>Agency Name</FormLabel>*/}
                                                    {/*            <Select onValueChange={field.onChange}*/}
                                                    {/*                    defaultValue={field.value as string}>*/}
                                                    {/*                <SelectTrigger></SelectTrigger>*/}
                                                    {/*                <SelectContent>*/}
                                                    {/*                    <SelectItem*/}
                                                    {/*                        value="Jane Doa">Jane</SelectItem>*/}
                                                    {/*                </SelectContent>*/}
                                                    {/*            </Select>*/}
                                                    {/*            <FormMessage/>*/}
                                                    {/*        </FormItem>*/}
                                                    {/*    )}*/}
                                                    {/*/>*/}
                                                </>
                                                <Button className="self-end px-16">Next</Button>
                                            </motion.div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            </>
                        }

                        {/* JOB   */}
                        <div className="flex gap-4 w-full">
                            <FormField
                                control={form.control}
                                name="job"
                                render={({field}) => (
                                    <FormItem
                                        className="w-full flex items-center gap-4 justify-between">
                                        <FormLabel>Job Name apply to</FormLabel>
                                        <Select onValueChange={field.onChange}
                                                defaultValue={field.value as string}>
                                            <SelectTrigger></SelectTrigger>
                                            <SelectContent>
                                                {job && job?.map((job, i) => (
                                                    <SelectItem key={i} value={String(job.id)}>{job.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button type="submit">Create</Button>
                    </form>
                </Form>
            </div>
        </>
    );
};

export default CreateApplicationModal;