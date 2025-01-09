import React from 'react';
import {get_candidate_with_details} from "@/server/db/candidates";
import {Badge} from "@/components/ui/badge";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {CustomTabsTrigger, Tabs, TabsContent, TabsList} from "@/components/ui/tabs";
import {BriefcaseBusiness, CircleUser, SettingsIcon} from "lucide-react";
import Link from "next/link";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import CandidateSummary from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-summary";

type Props = {
    params: {
        candidateId: string;
    }
};

const Page = async ({params}: Props) => {
    const [f] = await get_candidate_with_details(Number(params.candidateId));

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between w-full p-4">
                <div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-14 h-14">
                                <AvatarImage src="https://github.com/shadcn.png"/>
                            </Avatar>

                            <div className="">
                                <div className="flex items-center gap-4">
                                    <h1 className="font-bold text-xl">{f.candidateName}</h1>
                                    <Badge
                                        className="bg-green-100 text-green-500 font-normal shadow-none py-0 h-5">{f.candidate_status}</Badge>
                                    <Badge
                                        className="bg-green-100 text-green-500 font-normal shadow-none py-0 h-5">Follow</Badge>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="text-sm text-slate-400">Ratings score</p>
                                    <p className="text-sm text-slate-400">Last contacted: 7 days ago</p>
                                </div>

                                <div className="flex items-center gap-4 text-slate-400">
                                    <p className="text-sm">Added by: <span className="text-blue-400">John Doe</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>Send Email</Button>
                        </DialogTrigger>
                        <DialogContent>
                        </DialogContent>
                    </Dialog>
                    <Dialog >
                        <DialogTrigger asChild>
                            <Button>
                                <SettingsIcon/>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex px-4 ">
                <Tabs className="px-0 h-full w-full" defaultValue="summary">
                    <TabsList className="bg-transparent rounded-none p-0 border-b w-full justify-start">
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="summary">
                            <BriefcaseBusiness size={20}/>
                            <Link href=''>Summary</Link>
                        </CustomTabsTrigger>
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="resume">
                            <CircleUser size={20}/>
                            <Link href=''>Resume</Link>
                        </CustomTabsTrigger>
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="interviews">
                            <CircleUser size={20}/>
                            <Link href=''>Interviews</Link>
                        </CustomTabsTrigger>
                    </TabsList>

                    <TabsContent value="summary">
                        <CandidateSummary />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Page;