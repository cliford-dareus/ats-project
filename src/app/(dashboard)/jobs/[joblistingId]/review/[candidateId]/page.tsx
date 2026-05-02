import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {ChevronDown} from "lucide-react";
import {CustomTabsTrigger, Tabs, TabsContent, TabsList} from "@/components/ui/tabs";
import {get_user_applications} from "@/server/db/application";
import {get_candidate_with_details} from "@/server/db/candidates";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";

type Props = {
    params: {
        joblistingId: string
        candidateId: string
    }
};

const Page = async ({params}: Props) => {
    const {candidateId} = await params;
    
    const applications = await get_user_applications(Number(candidateId));
    const [candidate] = await get_candidate_with_details(Number(candidateId));

    if (!candidate || !applications) return;
        
    return (
        <div className="p-4">
            <div className="mb-4 ">
              <h1 className="font-bold text-xl">Review <br/> {candidate?.candidateName} <br/> Application</h1>
            </div>
            <div className="flex justify-between border items-center py-1.5 px-4 rounded">
                <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src="https://github.com/shadcn.png"/>
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <p className=" text-blue-500 leading-3">{candidate?.candidateName}</p>
              <p className="text-xs text-slate-500">Source: { candidate.stageName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost"
                                    className="border px-4 py-1.5 flex items-center gap-4 rounded cursor-pointer">
                                <p className="text-sm">Advance</p>
                                <ChevronDown size={18}/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText('.hello')}
                            >
                                Copy payment ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem>View customer</DropdownMenuItem>
                            <DropdownMenuItem>View payment details</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="border px-4 py-1.5 flex items-center gap-4 rounded cursor-pointer">
                                <p className="text-sm">Reject</p>
                                <ChevronDown size={18}/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                // onClick={() => navigator.clipboard.writeText(payment.id)}
                            >
                                Copy payment ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem>View customer</DropdownMenuItem>
                            <DropdownMenuItem>View payment details</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                                                   value="application">Application
                                    ({applications.length})</CustomTabsTrigger>
                            </TabsList>
                        </div>
                    </TabsList>
                    <TabsContent value="profile">Profile</TabsContent>
                    <TabsContent value="resume">
                        Resume
                    </TabsContent>
                    <TabsContent value="application">
                        {JSON.stringify(applications)}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Page;