'use client'

import React, {useState} from 'react';
import {DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Separator} from "@/components/ui/separator";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {BriefcaseBusiness, CalendarIcon, ChevronDownCircle, Command, FlaskConical, ListStart, Plus} from "lucide-react";
import {motion} from "motion/react";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {z} from 'zod'
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import MultiSelect from "@/components/multi-select";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {checkFormStatus, cn} from "@/lib/utils";
import {format} from "date-fns";
import {Calendar} from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {create_job_action} from "@/server/actions/job-listings-actions";
import {formSchema, JOB_STAGES, stageSchema, techSchema} from "@/schema";


const STEPS = [
    {step: 1, status: 'In-Complete', open: true},
    {step: 2, status: 'In-Complete', open: false},
    {step: 3, status: 'In-Complete', open: false},
    {step: 4, status: 'In-Complete', open: false}
];

const CreateJobListingModal = () => {
    const [isOpen, setIsOpen] = useState(STEPS);
    // const [isLoading, setIsLoading] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            jobInfo: {job_name: "", job_description: "", job_location: "", salary_up_to: ""},
            jobTechnology: [],
            jobStages: [],
            jobOptional: {job_effective_date: new Date(), job_agency: ""}
        }
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        console.log(data);
        try {
            const job = await create_job_action(data);
            if (!job) {
                console.log(job)
            }
        } catch (err) {
            console.log(err)
        }
    };

    const changeForm = (index: number) => {
        setIsOpen((prevIsOpen) =>
            prevIsOpen.map((s) => {
                if (s.step === index) {
                    return {...s, open: true};
                }
                if (s.step === index - 1) {
                    const status = checkFormStatus(index - 1 === 0 || index - 1 === 1 ? "jobInfo" :
                        index - 1 === 2 ? 'jobTechnology' : 'jobOptional', form, index - 1 === 0 || index - 1 === 1 ? "jobInfo" :
                        index - 1 === 2 ? 'jobTechnology' : 'jobOptional'
                    )
                    console.log('status', status);
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
                    <DialogTitle className="text-2xl">Create Job Opening</DialogTitle>
                    <DialogDescription>Complete each step to create a job opening!</DialogDescription>
                </div>
            </DialogHeader>
            <Separator/>
            <div>
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
                                open={isOpen[0].open}
                                onOpenChange={() => {
                                    if (!isOpen[0].open) changeForm(1)
                                    // setStepActives(STEPS[0])
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
                                            <Badge>{isOpen[0].status}</Badge>
                                            <ChevronDownCircle size={24}/>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <motion.div
                                        initial={{height: 0, opacity: 0}}
                                        animate={{height: "auto", opacity: 1}}
                                        exit={{height: 0, opacity: 0}}
                                        // key={stepActive.step}
                                        transition={{duration: 0.2,}}
                                        className={cn(isOpen[0].open ? "p-4 border" : "", "flex flex-col gap-2 rounded-lg")}
                                    >
                                        <FormField
                                            control={form.control}
                                            name="jobInfo.job_name"
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
                                            name="jobInfo.job_location"
                                            render={({field}) => (
                                                <FormItem className="flex items-center gap-4 justify-between">
                                                    <FormLabel>Job Location</FormLabel>
                                                    <FormControl>
                                                        <Input className="w-[260px]"
                                                               placeholder="New York" {...field} />
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="jobInfo.job_description"
                                            render={({field}) => (
                                                <FormItem className="flex items-center gap-4 justify-between">
                                                    <FormLabel>Job Description</FormLabel>
                                                    <FormControl>
                                                        <Input className="w-[260px]"
                                                               placeholder="Description..." {...field} />
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="jobInfo.salary_up_to"
                                            render={({field}) => (
                                                <FormItem className="flex items-center gap-4 justify-between">
                                                    <FormLabel>Job Salary</FormLabel>
                                                    <FormControl>
                                                        <Input className="w-[260px]"
                                                               placeholder="30000/year" {...field} />
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            onClick={() => changeForm(2)}
                                            className="self-end px-16"
                                        >
                                            Next
                                        </Button>
                                    </motion.div>
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
                                open={isOpen[1].open}
                                onOpenChange={() => {
                                    if (!isOpen[1].open) changeForm(2)
                                    // setStepActives(STEPS[1])
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
                                        <div className="flex items-center gap-2">
                                            <Badge>{isOpen[1].status}</Badge>
                                            <ChevronDownCircle size={24}/>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <motion.div
                                        initial={{height: 0, opacity: 0}}
                                        animate={{height: "auto", opacity: 1}}
                                        exit={{height: 0, opacity: 0}}
                                        // key={stepActive.step}
                                        transition={{duration: 0.2, ease: "easeInOut"}}
                                    >
                                        <Popover>
                                            <PopoverTrigger className="flex gap-4 items-center">
                                                <Plus/>
                                                <span>Experience</span>
                                            </PopoverTrigger>
                                            <PopoverContent>
                                                <MultiSelect
                                                    schema={techSchema}
                                                    fieldName={"jobTechnology"}
                                                    setValue={form.setValue}
                                                    getValues={form.getValues}
                                                    renderForm={(onSubmit, forms) => (
                                                        <>
                                                            <FormItem
                                                                className="flex items-center gap-4 justify-between">
                                                                <FormLabel>Job Name</FormLabel>
                                                                <FormControl>
                                                                    <Input {...forms.register("technology")}
                                                                           className="w-[260px]" placeholder="Acme"/>
                                                                </FormControl>
                                                                <FormMessage/>
                                                            </FormItem>

                                                            <FormItem
                                                                className="flex items-center gap-4 justify-between">
                                                                <FormLabel>Job Name</FormLabel>
                                                                <FormControl>
                                                                    <Input {...forms.register("year_of_experience")}
                                                                           className="w-[260px]" placeholder="Acme"/>
                                                                </FormControl>
                                                                <FormMessage/>
                                                            </FormItem>
                                                        </>
                                                    )}
                                                    renderSelectedItems={(items, onRemove) => (
                                                        <div className="flex flex-wrap gap-2">
                                                            {items.map((item, index) => (
                                                                <Badge key={index} className="flex">
                                                                    {item.technology} - {item.year_of_experience}
                                                                    <button onClick={() => onRemove(index)}>×</button>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                />
                                            </PopoverContent>
                                        </Popover>

                                        <Button
                                            onClick={() => changeForm(3)}
                                            className="self-end px-16"
                                        >Next</Button>
                                    </motion.div>

                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                        {/* JOB STAGES */}
                        <div className="flex gap-4 w-full">
                            <div
                                className="w-[60px] h-[50px] border rounded-full flex items-center justify-center "
                            >
                                <ListStart size={24}/>
                            </div>
                            <Collapsible
                                open={isOpen[2].open}
                                onOpenChange={() => {
                                    if (!isOpen[2].open) changeForm(3)
                                    // setStepActives(STEPS[1])
                                }}
                                className="w-full flex gap-4 flex-col"
                            >
                                <CollapsibleTrigger>
                                    <div className="flex items-center justify-between h-[50px]">
                                        <div className="flex flex-col items-start">
                                            <h2 className="text-lg font-semibold leading-none tracking-tight">Job
                                                Stages</h2>
                                            <p className="text-sm text-muted-foreground">Provided required info</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge>{isOpen[2].status}</Badge>
                                            <ChevronDownCircle size={24}/>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <motion.div
                                        initial={{height: 0, opacity: 0}}
                                        animate={{height: "auto", opacity: 1}}
                                        exit={{height: 0, opacity: 0}}
                                        // key={stepActive.step}
                                        transition={{duration: 0.2, ease: "easeInOut"}}
                                    >
                                        <Popover>
                                            <PopoverTrigger className="flex gap-4 items-center">
                                                <Plus/>
                                                <span>Experience</span>
                                            </PopoverTrigger>
                                            <PopoverContent>
                                                <MultiSelect
                                                    schema={stageSchema}
                                                    fieldName="jobStages"
                                                    setValue={form.setValue}
                                                    getValues={form.getValues}
                                                    renderForm={(onSubmit, forms) => (
                                                        <>
                                                            <Select
                                                                {...forms.register("stage_name")}
                                                                onValueChange={(e) => forms.setValue("stage_name", e)}
                                                            >
                                                                <SelectTrigger className="w-[180px]">
                                                                    <SelectValue placeholder="Select a fruit"/>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {JOB_STAGES.map(stage => (
                                                                        <SelectItem key={stage}
                                                                                    value={stage}>{stage}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Input {...forms.register('stage_assign_to')}
                                                                   placeholder="Years of Experience"/>
                                                        </>
                                                    )}
                                                    renderSelectedItems={(items, onRemove) => (
                                                        <div className="flex flex-wrap gap-2">
                                                            {items.map((item, index) => (
                                                                <Badge key={index} className="flex">
                                                                    {item.stage_name} - {item.stage_assign_to}
                                                                    <button onClick={() => onRemove(index)}>×</button>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <Button
                                            onClick={() => changeForm(4)}
                                            className="self-end px-16"
                                        >Next</Button>
                                    </motion.div>

                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                        {/* OPTIONAL INFO*/}
                        <div className="flex gap-4 w-full">
                            <div
                                className="w-[60px] h-[50px] border rounded-full flex items-center justify-center ">
                                <BriefcaseBusiness size={24}/>
                            </div>
                            <Collapsible
                                className="w-full flex gap-4 flex-col"
                                open={isOpen[3].open}
                                onOpenChange={() => {
                                    if (!isOpen[3].open) changeForm(4)
                                    // setStepActives(STEPS[2])
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
                                            <Badge>{isOpen[3].status}</Badge>
                                            <ChevronDownCircle size={24}/>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <motion.div
                                        initial={{height: 0, opacity: 0}}
                                        animate={{height: "auto", opacity: 1}}
                                        exit={{height: 0, opacity: 0}}
                                        // key={stepActive.step}
                                        transition={{duration: 0.2, ease: "easeInOut"}}
                                        className={cn(isOpen[0].open ? "p-4 border" : "", "flex flex-col gap-2 rounded-lg")}
                                    >
                                        <FormField
                                            control={form.control}
                                            name="jobOptional.job_agency"
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
                                            name="jobOptional.job_effective_date"
                                            render={({field}) => (
                                                <FormItem>
                                                    <Popover>
                                                        <div className="flex items-center gap-4 justify-between">
                                                            <FormLabel>End date</FormLabel>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button
                                                                        variant={"outline"}
                                                                        className={cn(
                                                                            "w-[260px] pl-3 text-left font-normal",
                                                                            !field.value && "text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        {field.value ? (
                                                                            format(field.value, "PPP")
                                                                        ) : (
                                                                            <span>Pick a date</span>
                                                                        )}
                                                                        <CalendarIcon
                                                                            className="ml-auto h-4 w-4 opacity-50"/>
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                        </div>

                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                                disabled={(date) =>
                                                                    date > new Date() || date < new Date("1900-01-01")
                                                                }
                                                                // initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            onClick={() => changeForm(5)}
                                            className="self-end px-16"
                                        >
                                            Next
                                        </Button>
                                    </motion.div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        <div className="flex gap-4">
                            <Button type="submit">Create</Button>
                        </div>
                    </form>
                </Form>
            </div>
        </>
    )
};

export default CreateJobListingModal;