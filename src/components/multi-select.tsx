import React, {useEffect} from 'react';
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {z} from "zod";
import {useForm, UseFormSetValue, UseFormGetValues} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {formSchema} from "@/app/(dashboard)/jobs/_components/create-job-listing-modal";
import {Plus} from "lucide-react";

const techSchema = z.object({
    technology: z.string(),
    year_of_experience: z.string(),
})

type Props = {
    getValues: UseFormGetValues<z.infer<typeof formSchema>>;
    setValue: UseFormSetValue<z.infer<typeof formSchema>>;
}

const MultiSelect = ({setValue, getValues}: Props) => {
    const [selected, setSelected] = React.useState<z.infer<typeof techSchema>[]>([]);

    const form = useForm<z.infer<typeof techSchema>>({
        resolver: zodResolver(techSchema),
        defaultValues: {
            year_of_experience: '',
            technology: ''
        }
    })

    const add = (data: z.infer<typeof techSchema>) => {
        setSelected((prev) => [...(prev as z.infer<typeof techSchema>[] || []), data])
        setValue('jobTechnology', [...(selected as z.infer<typeof techSchema>[] || []), data])
    }

    useEffect(() => {
        if (!getValues().jobTechnology) return;
        setSelected([...getValues().jobTechnology])
    }, []);

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="">
                <Popover>
                    <PopoverTrigger className="flex gap-4 items-center">
                        <Plus/>
                        <span>Experience</span>

                    </PopoverTrigger>
                    <PopoverContent>
                    <Form {...form}>
                            <form onSubmit={form.handleSubmit(add)}>
                                <FormField
                                    control={form.control}
                                    name="technology"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Technology</FormLabel>
                                            <FormControl>
                                                <Input placeholder="shadcn" {...field} />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="year_of_experience"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Year of Experience</FormLabel>
                                            <FormControl>
                                                <Input placeholder="shadcn" {...field} />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                <Button type={"submit"}>Add</Button>
                            </form>
                        </Form>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="flex flex-wrap items-center gap-2 border bg-muted min-h-8 p-2 rounded">
                {selected.map((tech, i) => (
                    <Badge className="flex" key={i}>
                        <p>{tech.technology}-{tech.year_of_experience}</p>
                    </Badge>
                ))}
            </div>
        </div>
    );
};

export default MultiSelect;