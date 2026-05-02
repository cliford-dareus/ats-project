"use client";

import {Button} from "@/components/ui/button";
import {Form, FormField} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {useDebounce} from "@/hooks/use-debounce";
import {zodResolver} from "@hookform/resolvers/zod";
import {motion} from "framer-motion";
import {ArrowLeft, LucideCornerDownLeft} from "lucide-react";
import {useRouter, useSearchParams} from "next/navigation";
import {useEffect, useRef, useTransition} from "react";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {useOrganizationList} from "@clerk/nextjs";

const inviteeForm = z.object({
    orgId: z.string()
});

const JoinOrganization = ({userId}: { userId: string }) => {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const showText = useDebounce(true, 800);
    const searchParams = useSearchParams();
    const [isCreatePending, startCreateTransaction] = useTransition();
    const {createOrganization, setActive} = useOrganizationList();

    const form = useForm<z.infer<typeof inviteeForm>>({
        resolver: zodResolver(inviteeForm),
        defaultValues: {
            orgId: "",
        },
    });

    const join = async (data: z.infer<typeof inviteeForm>) => {
        startCreateTransaction(async () => {
            try {
                if (createOrganization) {
                    const result = await fetch(`api/organization/join/?orgId=${data.orgId}`, {
                        method: "POST"
                    });
                    console.log("result", result, userId);
                    if (!result.ok) {
                        throw new Error("Failed to join organization");
                    };

                    const organization = await result.json();
                    await setActive({organization: data.orgId});
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.set("step", "success");
                    newSearchParams.set("orgId", organization.id);
                    router.push(`/onboarding?${newSearchParams.toString()}`);
                }
            } catch (error) {
                console.error(error);
            };
        });
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <motion.div
            className="flex flex-col h-screen p-4 container mx-auto"
            exit={{opacity: 0, scale: 0.95}}
            transition={{duration: 0.3, type: "spring"}}
        >
            {showText && <motion.div
                className="mt-[40%] w-full flex"
                variants={{
                    show: {
                        transition: {
                            staggerChildren: 0.2,
                        },
                    },
                }}
                initial="hidden"
                animate="show"
            >
                <motion.div className="w-[40%] flex flex-col gap-4">
          <span onClick={() => router.back()} className="text-muted-foreground flex items-center gap-2 cursor-pointer">
            <ArrowLeft size={16}/> Back
          </span>
                    <motion.h1
                        className="text-balance text-2xl font-bold text-blue-900"
                        variants={{
                            hidden: {opacity: 0, y: 50},
                            show: {
                                opacity: 1,
                                y: 0,
                                transition: {duration: 0.4, type: "spring"},
                            },
                        }}
                    >
                        Organization Link
                    </motion.h1>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(join)}>
                            <motion.div
                                className="flex flex-col gap-4"
                                variants={{
                                    hidden: {opacity: 0, y: 50},
                                    show: {
                                        opacity: 1,
                                        y: 0,
                                        transition: {duration: 0.4, type: "spring"},
                                    },
                                }}
                            >
                                <FormField
                                    control={form.control}
                                    name="orgId"
                                    render={({field}) => {
                                        console.log("Field props:", field)
                                        return(<div className="flex items-center gap-2">
                                            <span className="text-5xl text-muted-foreground">https://</span>
                                            <Input
                                                className="md:text-6xl border-none outline-none shadow-none h-14 p-0 focus-visible:ring-0 caret-sky-500"
                                                placeholder=""
                                                {...field}
                                                // ref={inputRef}
                                            />
                                        </div>)
                                    }}
                                />

                                <div className="flex items-center gap-4">
                                    <Button type="submit" disabled={isCreatePending}
                                            className="rounded-full bg-blue-400 px-10">Next</Button>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <LucideCornerDownLeft size={16}/>
                                        <span className=" text-sm">or press Enter</span>
                                    </div>
                                </div>
                            </motion.div>
                        </form>
                    </Form>
                </motion.div>

                <motion.div className="">
                    <div className="h-[300px]">
                        <div className="">{}</div>
                    </div>
                </motion.div>
            </motion.div>}
        </motion.div>
    );
};

export default JoinOrganization;
