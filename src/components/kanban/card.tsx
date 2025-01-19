'use client'

import {JobListingWithCandidatesType} from "@/types/job-listings-types";
import React from "react";
import DropIndicator from "@/components/kanban/drop-indicator";
import {motion} from "motion/react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import Link from "next/link";
import {Dialog, DialogContent, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {ChevronDown} from "lucide-react";
import {CustomTabsTrigger, Tabs, TabsContent, TabsList} from "@/components/ui/tabs";

type Props = {
    data: JobListingWithCandidatesType;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, i: number) => void;
    stage: number;
};

const Card = ({data, handleDragStart, stage}: Props) => {

    return (
        <div>
            <DropIndicator active={false} beforeId={data.application_id} stage={stage} column={data.stageName}/>
            <motion.div
                layout
                layoutId={String(data?.application_id)}
                draggable="true"
                onDragStart={(e: never) => handleDragStart(e, data.application_id!)}
                className="cursor-grab rounded bg-white border shadow p-2 active:cursor-grabbing z-50"
            >
                <div className="flex gap-4 items-center">
                    <Avatar className="w-8 h-8">
                        <AvatarImage src="https://github.com/shadcn.png"/>
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className="">
                        <p className="text-base font-bold leading-4">{data?.candidate_name}</p>
                        {
                            stage === 1 ?
                                (<Dialog>
                                    <DialogTrigger>
                                        <p className="text-xs text-blue-500 leading-4">Review application</p>
                                    </DialogTrigger>
                                    <DialogContent className="">
                                        <DialogTitle>Review {data.candidate_name} Application</DialogTitle>
                                        <div className="flex justify-between border items-center py-1.5 px-4 rounded">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src="https://github.com/shadcn.png"/>
                                                    <AvatarFallback>CN</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <p className="text-sm text-blue-500 leading-3">{data.candidate_name}</p>
                                                    <p className="text-sm text-slate-500">Source: </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="border px-4 py-1.5 flex items-center gap-4 rounded cursor-pointer">
                                                    <p className="text-sm">Advance</p>
                                                    <ChevronDown size={18}/>
                                                </div>
                                                <div
                                                    className="px-4 py-1.5 bg-black text-white flex items-center gap-4 rounded cursor-pointer">
                                                    <p className="text-sm">Reject</p>
                                                    <ChevronDown size={18}/>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="">
                                            <Tabs defaultValue="profile">
                                                <TabsList>
                                                    <div className="border-b">
                                                        <TabsList className="bg-transparent rounded-none p-0">
                                                            <CustomTabsTrigger className="px-8 flex items-center gap-4"
                                                                               value="profile">Profile</CustomTabsTrigger>
                                                            <CustomTabsTrigger className="px-4 flex items-center gap-4"
                                                                               value="resume">Resume</CustomTabsTrigger>
                                                            <CustomTabsTrigger className="px-4 flex items-center gap-4"
                                                                               value="application">Application</CustomTabsTrigger>
                                                        </TabsList>
                                                    </div>
                                                </TabsList>
                                                <TabsContent value="profile">Profile</TabsContent>
                                                <TabsContent value="resume">
                                                    Resume
                                                </TabsContent>
                                                <TabsContent value="application">
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    </DialogContent>
                                </Dialog>)
                                :
                                (<Link
                                    className="text-xs text-blue-500 leading-4"
                                    href={``}
                                >
                                    View Profile
                                </Link>)
                        }
                    </div>
                </div>

                <p className="text-xs text-slate-400 mt-2">{data.application_id} days ago</p>
            </motion.div>
        </div>
    );
};

export default Card;