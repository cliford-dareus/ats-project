'use client'

import React, {useEffect, useState} from 'react';
import {DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Separator} from "@/components/ui/separator";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {BriefcaseBusiness, ChevronDownCircle, Command, FlaskConical} from "lucide-react";
import {motion} from "motion/react";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {z} from 'zod'
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import MultiSelect from "@/components/multi-select";

export const formSchema = z.object({
    jobInfo: z.object({
        job_name: z.string(),
        job_description: z.string(),
        job_location: z.string(),
        // salary_up_to: z.string(),
        // created_by: z.string(),
    }).required(),
    jobTechnology: z.array(
            z.object({
                technology: z.string(),
                year_of_experience: z.string(),
            })
        )
})

const CreateJobListingModal = () => {
    // const [] = useState()
    const [isOpen, setIsOpen] = useState([true,false, false]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            jobInfo: {
                job_name: "",
                job_description: "",
                job_location: "",
            }
        }
    });

    const onSubmit = (data: z.infer<typeof formSchema>) => {
        console.log(data)
    }

    // const checkFormStatus = () => {
    //     const object = form.getValues();
    //
    //     switch (isOpen) {
    //         case isOpen[0]:
    //             const jobInfo = object.jobInfo as { [key: string]: string };
    //             if (!jobInfo) return false;
    //             return Object.keys(jobInfo).every(s => jobInfo[s] !== '');
    //         case "jobTechnology":
    //     }
    // }

    useEffect(() => {

    }, []);

    return (
        <>
            <DialogHeader className="flex flex-row gap-4 items-center">
                <div className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Command />
                </div>
                <div className="">
                    <DialogTitle className="text-2xl">Create Job Opening</DialogTitle>
                    <DialogDescription>Complete each step to create a job opening!</DialogDescription>
                </div>
            </DialogHeader>

            <Separator/>

            <motion.div className="w-full">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="w-full flex flex-col gap-4 items-center"
                    >
                        {/* JOB INFORMATION */}
                        <div className="flex gap-4 w-full">
                            <div
                                className="w-[60px] h-[50px] border rounded-full flex items-center justify-center ">
                                <BriefcaseBusiness size={24}/>
                            </div>
                            <Collapsible
                                className="w-full flex gap-4 flex-col"
                                open={isOpen[0]}
                                onOpenChange={() => {
                                    if (!isOpen[0] && isOpen.includes(true)) {
                                        setIsOpen([true, false, false]);
                                    }
                                }}
                            >
                                <CollapsibleTrigger>
                                    <div className="flex items-center justify-between h-[50px]">
                                        <div className="flex flex-col items-start">
                                            <h2 className="text-lg font-semibold leading-none tracking-tight">Job
                                                Information</h2>
                                            <p className="text-sm text-muted-foreground">Provided required info</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge>In Progress</Badge>
                                            <ChevronDownCircle size={24}/>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <FormField
                                        control={form.control}
                                        name="jobInfo.job_name"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Job Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="shadcn" {...field} />
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="jobInfo.job_location"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Job Location</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="shadcn" {...field} />
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="jobInfo.job_description"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Job Description</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="shadcn" {...field} />
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                        {/* JOB EXPERIENCE */}
                        <div className="flex gap-4 w-full">
                            <div
                                className="w-[60px] h-[50px] border rounded-full flex items-center justify-center "
                            >
                                <FlaskConical size={24}/>
                            </div>
                            <Collapsible
                                open={isOpen[1]}
                                onOpenChange={() => {
                                    if (!isOpen[1] && isOpen.includes(true)) {
                                        setIsOpen([false, true, false]);
                                    }
                                }}
                                className="w-full flex gap-4 flex-col"
                            >
                                <CollapsibleTrigger>
                                    <div className="flex items-center justify-between h-[50px]">
                                        <div className="flex flex-col items-start">
                                            <h2 className="text-lg font-semibold leading-none tracking-tight">Job
                                                Experience</h2>
                                            <p className="text-sm text-muted-foreground">Provided required info</p>
                                        </div>
                                        <ChevronDownCircle size={24}/>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <MultiSelect setValue={form.setValue} getValues={form.getValues}/>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        <div className="flex gap-4">
                            <Button type="submit">Create</Button>
                        </div>
                    </form>
                </Form>
            </motion.div>
        </>
    )
};

export default CreateJobListingModal;