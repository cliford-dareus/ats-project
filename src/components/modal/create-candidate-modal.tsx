'use client'

import React from 'react';
import {DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {BriefcaseBusiness, CalendarIcon, ChevronDownCircle, Command} from "lucide-react";
import {Separator} from "@/components/ui/separator";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {Badge} from "@/components/ui/badge";
import {motion} from "motion/react";
import {cn} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {format} from "date-fns";
import {Calendar} from "@/components/ui/calendar";

export const candidateForm = z.object({
    candidate_info: z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string(),
    })
})

const CreateCandidateModal = () => {
    const form = useForm<z.infer<typeof candidateForm>>({
        resolver: zodResolver(candidateForm),
    });

    const onsubmit = (data: z.infer<typeof candidateForm>) => {}

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
            <Separator />
            <div>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onsubmit)}
                        className="w-full flex flex-col gap-4 items-center"
                    >
                        {/* CANDIDATE INFO */}
                        <div className="flex gap-4 w-full">
                            <div
                                className="w-[60px] h-[50px] border rounded-full flex items-center justify-center ">
                                <BriefcaseBusiness size={24}/>
                            </div>
                            <Collapsible
                                className="w-full flex gap-4 flex-col"
                                // open={isOpen[3].open}
                                // onOpenChange={() => {
                                //     if (!isOpen[3].open) changeForm(4)
                                //     // setStepActives(STEPS[2])
                                // }}

                            >
                                <CollapsibleTrigger>
                                    <div className="flex items-center justify-between h-[50px]">
                                        <div className="flex flex-col items-start">
                                            <h2 className="text-lg font-semibold leading-none tracking-tight">Candidate
                                                Information</h2>
                                            <p className="text-sm text-muted-foreground">Provided required info</p>
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
                                            control={form.control}
                                            name="candidate_info.name"
                                            render={({field}) => (
                                                <FormItem className="flex items-center gap-4 justify-between">
                                                    <FormLabel>Agency Name</FormLabel>
                                                    <FormControl>
                                                        <Input className="w-[260px]"
                                                               placeholder="shadcn" {...field} />
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
                                                    <FormLabel>Job Name</FormLabel>
                                                    <FormControl>
                                                        <Input className="w-[260px]"
                                                               placeholder="Acme" {...field} />
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
                                                    <FormLabel>Job Name</FormLabel>
                                                    <FormControl>
                                                        <Input className="w-[260px]"
                                                               placeholder="Acme" {...field} />
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            // onClick={() => changeForm(5)}
                                            className="self-end px-16"
                                        >
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
                                // open={isOpen[3].open}
                                // onOpenChange={() => {
                                //     if (!isOpen[3].open) changeForm(4)
                                //     // setStepActives(STEPS[2])
                                // }}

                            >
                                <CollapsibleTrigger>
                                    <div className="flex items-center justify-between h-[50px]">
                                        <div className="flex flex-col items-start">
                                            <h2 className="text-lg font-semibold leading-none tracking-tight">Candidate
                                                File</h2>
                                            <p className="text-sm text-muted-foreground">Provided required info</p>
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
                                            control={form.control}
                                            name="candidate_info.name"
                                            render={({field}) => (
                                                <FormItem className="flex items-center gap-4 justify-between">
                                                    <FormLabel>Agency Name</FormLabel>
                                                    <FormControl>
                                                        <Input className="w-[260px]"
                                                               placeholder="shadcn" {...field} />
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
                                                    <FormLabel>Job Name</FormLabel>
                                                    <FormControl>
                                                        <Input className="w-[260px]"
                                                               placeholder="Acme" {...field} />
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
                                                    <FormLabel>Job Name</FormLabel>
                                                    <FormControl>
                                                        <Input className="w-[260px]"
                                                               placeholder="Acme" {...field} />
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            // onClick={() => changeForm(5)}
                                            className="self-end px-16"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    </form>
                </Form>
            </div>
        </>
    );
};

export default CreateCandidateModal;