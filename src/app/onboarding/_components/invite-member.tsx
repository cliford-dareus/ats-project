"use client";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useDebounce} from "@/hooks/use-debounce";
import {ArrowLeft} from "lucide-react";
import {motion} from "motion/react";
import {useSearchParams} from "next/navigation";
import {useEffect, useRef, useState, useTransition} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {Form, FormField} from "@/components/ui/form";

type Props = {
    orgId: string | null;
    orgName: string | null;
};

type EmailPayload = {
    email: string;
    orgId: string;
    orgName: string;
};

const InviteForm = z.object({
    email: z.string()
});

const InviteMember = ({orgId, orgName}: Props) => {
    const [invitees, setInvitees] = useState<{ email: string, id: string }[]>([])
    const inputRef = useRef<HTMLInputElement | null>(null);
    const showText = useDebounce(true, 800);
    // const router = useRouter();
    const [isCreatePending, startCreateTransaction] = useTransition();

    const form = useForm({
        resolver: zodResolver(InviteForm),
        defaultValues: {
            email: "",
        }
    });

    const invite_member = async (data: z.infer<typeof InviteForm>) => {
        startCreateTransaction(async () => {
            const emailPayload = {
                email: data.email,
                orgId: orgId,
                orgName: orgName,
                subject: "Organization Invite",
            } as EmailPayload;
            try {
                const response = await fetch("/api/organization/invite", {
                    method: "POST",
                    body: JSON.stringify(emailPayload)
                });
                if (!response.ok) return
                const resend_result = await response.json();
                // Toast the user about email being sent
                setInvitees((prev) => [...prev, {email: data.email, id: resend_result}]);
            } catch (e) {
                console.error(e);
            }
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
                className="mt-[40%] w-full flex justify-between"
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
                  <span className="text-muted-foreground flex items-center">
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
                        {orgName}
                    </motion.h1>
                    <motion.p
                        className="text-muted-foreground text-sm"
                    >
                        Enter the email of the member to add to the organization!
                    </motion.p>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(invite_member)}>
                            <motion.div
                                className="flex flex-col gap-4"
                                variants={{
                                    hidden: {opacity: 0, y: 50},
                                    show: {
                                        opacity: 1,
                                        y: 0,
                                        transition: {duration: 0.4, type: "spring"},
                                    },
                                }}>
                                <FormField
                                    name="email"
                                    control={form.control}
                                    render={({field}) => {
                                        return (<div className="flex items-center gap-2">
                                            <Input
                                                ref={inputRef}
                                                className="md:text-5xl border-none outline-none shadow-none h-14 p-0 focus-visible:ring-0"
                                                placeholder=""
                                                {...field}
                                            />
                                        </div>)
                                    }}
                                />
                                <div className="flex items-center gap-4">
                                    <Button className="rounded-full bg-blue-400 px-10"
                                            disabled={isCreatePending}>Invite</Button>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <ArrowLeft size={16}/>
                                        <span className=" text-sm">Or press Enter</span>
                                    </div>
                                </div>
                            </motion.div>
                        </form>
                    </Form>

                    <div className="">
                        <Button>Skip</Button>
                    </div>
                </motion.div>

                <div className="">
                    {invitees.map((member) => (
                        <div key={member.id} className="">
                            <span>{member.email}</span>
                        </div>
                    ))}
                </div>
            </motion.div>}
        </motion.div>
    );
};

export default InviteMember;
