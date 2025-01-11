import React from 'react';
import {get_candidate_with_details} from "@/server/db/candidates";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {CustomTabsTrigger, Tabs, TabsContent, TabsList} from "@/components/ui/tabs";
import {BriefcaseBusiness, CircleUser, FileChartColumnIncreasing, SettingsIcon} from "lucide-react";
import Link from "next/link";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import CandidateSummary from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-summary";
import CandidateResume from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-resume";
import {get_user_applications} from "@/server/db/application";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import CandidateInterviews from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-interviews";
import CandidateApplications from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-applications";

type Props = {
    params: {
        candidateId: string;
    }
};

const Page = async ({params}: Props) => {
    const [f] = await get_candidate_with_details(Number(params.candidateId));
    const applications = await get_user_applications(Number(params.candidateId));
    // const attachment = await get_candidate_attachment(f.candidateId);

    console.log(applications);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between w-full p-4">
                <div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-14 h-14">
                                <AvatarImage src="https://github.com/shadcn.png"/>
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                            <div className="">
                                <h1 className="text-xl font-bold">{f.candidateName}</h1>
                                <p className="text-sm/5 flex items-center gap-2 text-slate-500">
                                    <FileChartColumnIncreasing size={16}/>
                                    <span>Stage: <span className="text-blue-500">{f.stageName}</span></span>
                                </p>
                                <p className="text-sm/5 flex items-center gap-2 text-slate-500">
                                    <CircleUser size={16}/>
                                    <span>Status: {f.candidate_status}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">Contact</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuItem>Email</DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem>Call</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Dialog>
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
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="application">
                            <CircleUser size={20}/>
                            <Link href=''>Applications</Link>
                        </CustomTabsTrigger>
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="interviews">
                            <CircleUser size={20}/>
                            <Link href=''>Interviews</Link>
                        </CustomTabsTrigger>
                    </TabsList>

                    <TabsContent value="summary">
                        <CandidateSummary data={f}/>
                    </TabsContent>
                    <TabsContent value="resume">
                        <CandidateResume data={f}/>
                    </TabsContent>
                    <TabsContent value="application">
                        <CandidateApplications data={f}/>
                        {/*{JSON.stringify(applications, null, 2)}*/}
                    </TabsContent>
                    <TabsContent value="interviews">
                        <CandidateInterviews data={f}/>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Page;