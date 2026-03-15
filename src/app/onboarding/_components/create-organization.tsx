"use client";

import {BackgroundGradient} from "@/components/ui/background-gradient";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useDebounce} from "@/hooks/use-debounce";
import {create_organization_action} from "@/server/actions/organization_actions";
import {useOrganizationList} from "@clerk/nextjs";
import {ArrowLeft, LucideCornerDownLeft} from "lucide-react";
import {motion} from "motion/react";
import {useRouter, useSearchParams} from "next/navigation";
import {useEffect, useState, useTransition} from "react";
import {z} from "zod";

type Props = {
    userId: string;
};

export const orgSchema = z.object({
    name: z.string().min(2).max(100),
});

const CreateOrganization = ({userId}: Props) => {
    const showText = useDebounce(true, 800);
    const [subdomain, setSubdomain] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isCreatePending, startCreateTransaction] = useTransition();
    const {createOrganization, setActive} = useOrganizationList()
    const [debouncedValue] = useDebounce(subdomain, 500);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        async function checkAvailability() {
            if (debouncedValue?.length < 3) {
                setIsAvailable(null);
                return;
            }

            setLoading(true);
            const res = await fetch(`/api/domains/check?subdomain=${debouncedValue}`);
            const data = await res.json();
            setIsAvailable(data.available);
            setLoading(false);
        }

        checkAvailability();
    }, [debouncedValue]);

    const submit = async (data: z.infer<typeof orgSchema>) => {
        startCreateTransaction(async () => {
            try {
                if (createOrganization) {
                    const new_org = await createOrganization({name: data.name});
                    await setActive({organization: new_org.id});
                    await create_organization_action({
                        clerk_id: new_org.id,
                        name: new_org.name,
                    });

                    // TODO: Check if Organization is created successfully
                    // Before navigation, ensure that the organization is active
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.set("step", "department");
                    newSearchParams.set("orgId", new_org.id);
                    newSearchParams.set("orgName", new_org.name);
                    router.push(`/onboarding?${newSearchParams.toString()}`);
                }
            } catch (err) {
                console.log(err);
            }
        });
    };

    return (
        <motion.div
            className="flex flex-col h-screen p-4 container mx-auto"
            exit={{opacity: 0, scale: 0.95}}
            transition={{duration: 0.3, type: "spring"}}
        >
            {showText && (
                <motion.div
                    className="mt-[40%] w-full flex items-center"
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
                    <motion.div className="flex flex-col gap-4">
                        <span
                            onClick={() => router.back()}
                            className="text-muted-foreground flex items-center gap-2 cursor-pointer"
                        >
                          <ArrowLeft size={16}/> Back
                        </span>
                        <motion.h1
                            className="uppercase text-balance text-2xl font-bold text-blue-900"
                            variants={{
                                hidden: {opacity: 0, y: 50},
                                show: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {duration: 0.4, type: "spring"},
                                },
                            }}
                        >
                            Organization Name
                        </motion.h1>

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
                            <div>
                                <form className="flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                                    <span className="text-5xl text-muted-foreground">
                                                        Org::
                                                    </span>
                                        <Input
                                            className="md:text-6xl border-none outline-none shadow-none h-14 p-0 focus-visible:ring-0 caret-sky-500"
                                            placeholder=""
                                            autoFocus
                                            value={subdomain}
                                            onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                        />
                                        <span className="md:text-5xl bg-gray-100 p-3 text-gray-500 border-l">
                                                        .youratshub.com
                                                    </span>
                                    </div>


                                    {/* Status Indicator */}
                                    <div className="mt-2 text-sm">
                                        {loading && <p className="text-gray-500">Checking availability...</p>}
                                        {isAvailable === true &&
                                            <p className="text-green-600">✓ This URL is available!</p>}
                                        {isAvailable === false &&
                                            <p className="text-red-600">✗ Sorry, that name is taken.</p>}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Button
                                            type="submit"
                                            disabled={isCreatePending}
                                            className="rounded-full bg-blue-400 px-10"
                                        >
                                            Next
                                        </Button>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <LucideCornerDownLeft size={16}/>
                                            <span className=" text-sm">Or press Enter</span>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/*<div className="ml-auto h-full w-[30%]">*/}
                    {/*    <BackgroundGradient className="min-w-[250px] grid grid-cols-1 p-4">*/}
                    {/*        <div className="border rounded-full p-2 h-10">*/}
                    {/*            <p className="">{subdomain}</p>*/}
                    {/*        </div>*/}
                    {/*    </BackgroundGradient>*/}
                    {/*</div>*/}
                </motion.div>
            )}
        </motion.div>
    );
};

export default CreateOrganization;
