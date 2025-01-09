import React, {useEffect, useRef} from 'react';
import {DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle} from "@/components/ui/drawer";
import {Button} from "@/components/ui/button";
import {ApplicationResponseType} from "@/types/job-listings-types";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {CustomTabsTrigger, Tabs, TabsContent, TabsList} from "@/components/ui/tabs";
import {useRouter} from "next/navigation";
import {JOB_STAGES} from "@/schema";
import {cn} from "@/lib/utils";

type Props = {
    data: ApplicationResponseType
};

const CandidatePreview = ({data}: Props) => {
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (ref.current?.classList.contains('target')) {
            const target = ref.current;
            let sibling = target.previousElementSibling;

            while (sibling) {
                ((sibling.childNodes[0] as SVGElement).childNodes[0] as SVGPathElement).setAttribute("fill", "#f87171");
                sibling = sibling.previousSibling as HTMLDivElement;
            }
        }
    }, [data]);

    return (
        <>
            <DrawerHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                        <AvatarImage src="https://github.com/shadcn.png"/>
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-4">
                            <DrawerTitle className="text-2xl">{data.candidate_name.toUpperCase()}</DrawerTitle>
                            <Badge>{data.candidate_status}</Badge>
                        </div>

                        <DrawerDescription asChild>
                            <div className="gap-4">
                                <p>Jan 4, 2025</p>
                                <p>Status: {data.current_stage}</p>
                            </div>
                        </DrawerDescription>
                    </div>
                </div>
            </DrawerHeader>

            <div className="px-4">
                <Tabs defaultValue="summary" className="w-full py-2">
                    <div className="border-b">
                        <TabsList className="bg-transparent rounded-none p-0">
                            <CustomTabsTrigger className="px-8 flex items-center gap-4"
                                               value="summary">Summary</CustomTabsTrigger>
                            <CustomTabsTrigger className="px-4 flex items-center gap-4"
                                               value="password">Interview</CustomTabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent className="" value="summary">
                        <div className="flex items-center gap-4 w-full mt-4">
                            <div className="w-full max-w-4xl mx-auto">
                                {/* Progress Bar Container */}
                                <div className="flex items-center justify-between">
                                    {/* Progress Steps */}
                                    <div
                                        className="flex w-full items-center overflow-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                        {
                                            JOB_STAGES.map((v) => (
                                                <div ref={ref} key={v}
                                                     className={cn(data.current_stage == v ? "target" : "", "relative -ml-8 first:ml-0")}>
                                                    <svg
                                                        className="w-[200px] h-[50px]"
                                                        width="350" height="69" viewBox="0 0 305 69" fill="none"
                                                        xmlns="http://www.w3.org/2000/svg">
                                                        <path
                                                            d="M2.08643 0.5H248.992L303.992 34.5L248.992 68.5H2.08643L57.0937 34.5L2.08643 0.5Z"
                                                            stroke="white"
                                                            fill={data.current_stage !== v ? "#cbd5e1" : "#dc2626"}
                                                        />
                                                    </svg>
                                                    <p className="absolute top-1/2 -translate-y-1/2 right-1/2 translate-x-1/2 text-white text-sm">{v}</p>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full flex flex-col border mt-4 rounded">
                            <div className="py-2 px-4 border-b ">
                                <h3>Details</h3>
                            </div>
                            <div className="flex items-center gap-4 py-2 px-4">
                                <div className="w-[150px]">
                                    <span>Current status</span>
                                    <Badge
                                        className="bg-green-100 text-green-500 font-normal shadow-none">{data.candidate_status}</Badge>
                                </div>

                                <div className="">
                                    <span>Assign To</span>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage src="https://github.com/shadcn.png"/>
                                        </Avatar>
                                        <span className="text-sm">{data.assign_to}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 py-2 px-4">
                                <div className="w-[150px]">
                                    <span>Stages</span>
                                    <p className="text-sm">{data.current_stage}</p>
                                </div>

                                <div className="w-[150px]">
                                    <span>Owner</span>
                                    <p className="text-sm">{data.candidate_status}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 py-2 px-4">
                                <div className="w-[150px]">
                                    <span>Applied Date</span>
                                    <p className="text-sm">{data.candidate_id}</p>
                                </div>

                                <div className="">
                                    <Button>Move to Next stage</Button>
                                </div>
                            </div>
                        </div>

                        <div className="h-[270px]">
                            <div className="w-full flex flex-col border mt-4 rounded">
                                <div className="py-2 px-4 border-b ">
                                    <h3>Notes</h3>
                                </div>
                                <div className="flex py-2 px-4">
                                    <Button>Add Note</Button>
                                </div>
                                <div className="flex flex-col gap-4 py-2 px-4">
                                    <div className="flex h-[75px] ">dddddd</div>
                                    <div className="flex h-[75px] ">dddddd</div>
                                </div>

                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="password">
                        <div className="flex flex-col border mt-4 rounded">
                            <div className="py-2 px-4 border-b ">
                                <h3>Interview Schedule</h3>
                            </div>

                            <div className="flex items-center gap-4 py-2 px-4">

                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <DrawerFooter className="mt-4 flex">
                <Button onClick={() => {
                    router.push(`/candidates/${data.id}`);
                }}>View Full Page</Button>
            </DrawerFooter>
        </>
    );
};

export default CandidatePreview;