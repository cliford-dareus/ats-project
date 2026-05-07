import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, ChevronDown, CircleUser, FileChartColumnIncreasing, SettingsIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { get_candidate_by_id_action } from "@/server/actions/candidates-actions";
import CandidateTabs from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate_tabs";

type Props = {
    params: Promise<{
        candidateId: string;
    }>
};

const Page = async ({ params }: Props) => {
    const { candidateId } = await params;
    const result = await get_candidate_by_id_action(Number(candidateId));
    const candidate = result && typeof result === "object" ? result : {};
    const error =
        result && typeof result === "object" && "error" in result
            ? result.error
            : null;

    if (error) {
        console.error("Error fetching job listings:", error);
        return <div>Error loading jobs.</div>;
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between w-full p-4">
                <div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-14 h-14">
                                <AvatarImage src="https://github.com/shadcn.png" />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                            <div className="">
                                <h1 className="text-xl font-bold">{candidate.candidate?.name}</h1>
                                <p className="text-sm/5 flex items-center gap-2 text-slate-500">
                                    <FileChartColumnIncreasing size={16} />
                                    <span>Software Developer</span>
                                </p>
                                <p className="text-sm/5 flex items-center gap-2 text-slate-500">
                                    <CircleUser size={16} />
                                    <span>Status: {candidate?.candidate?.status}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="gap-2">
                                <CheckCircle size={16} />
                                <span>Advance</span>
                                <ChevronDown size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Advance Candidate</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Email</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Call</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button>
                                <SettingsIcon size={16} />
                                Settings
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Call</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
            </div>
            <CandidateTabs data={candidate} />
        </div>
    );
};

export default Page;
