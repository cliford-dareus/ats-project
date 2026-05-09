import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ApplicationResponseType, StageResponseType } from "@/types";
import { AlertCircle, CheckCircle, ChevronDown, Clock, Eye, MessageSquare, Star, UserCheck, UserX, XCircle } from "lucide-react";
import { useTransition } from "react";

type Props = {
    applicationResult: ApplicationResponseType;
    stages: StageResponseType[];
}

const AppicationHeader = ({ applicationResult, stages }: Props) => {
    const [, startTransition] = useTransition();

    const moveToStage = async (stage: string) => {
        startTransition(async () => {
            try {

            } catch (error) {

            }
        });
    };
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 leading-tight uppercase">{applicationResult.candidate_name}</h2>
                        <p className="text-sm text-zinc-500 font-medium">
                            Applying for <span
                                className="text-primary font-bold uppercase">{applicationResult.job_apply}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    className="px-4 !py-2 border border-zinc-200 rounded-lg text-[10px] uppercase tracking-widest font-bold text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2">
                    <MessageSquare size={14} />
                    Message
                </button>

                <div className="flex">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="px-4 py-2 bg-primary text-white text-[10px] font-bold rounded-l-lg uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary/90 transition-colors">
                                <UserCheck size={14} />
                                Advance
                                <ChevronDown size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuRadioGroup
                                value={applicationResult?.current_stage as string}
                                onValueChange={moveToStage}
                            >
                                <DropdownMenuLabel>Advance Candidate</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {stages.map((stage) => (
                                    <DropdownMenuRadioItem
                                        value={stage.stage_name as string}
                                        key={stage.id}
                                        className={cn(
                                            "cursor-pointer",
                                            applicationResult.current_stage === stage.stage_name
                                                ? "bg-accent text-accent-foreground"
                                                : "",
                                        )}
                                    >
                                        {stage.stage_name}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold rounded-r-lg uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-colors">
                                <UserX size={14} />
                                Reject
                                <ChevronDown size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Rejection Reasons</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <AlertCircle size={16} className="mr-2" />
                                Not qualified
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <CheckCircle size={16} className="mr-2" />
                                Position filled
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Clock size={16} className="mr-2" />
                                No response
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <XCircle size={16} className="mr-2" />
                                Other
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
};

export default AppicationHeader;
