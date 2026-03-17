import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ApplicationResponseType, StageResponseType } from "@/types";
import { AlertCircle, CheckCircle, ChevronDown, Clock, Eye, MessageSquare, Star, XCircle } from "lucide-react";

type Props = {
    applicationResult: ApplicationResponseType;
    stages: StageResponseType[];
}

const AppicationHeader = ({ applicationResult, stages }: Props) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900">{applicationResult.candidate_name}</h2>
                        <p className="text-sm text-zinc-500 font-medium">
                            Applying for <span
                                className="text-blue-600 font-bold uppercase">{applicationResult.job_apply}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge
                            variant={applicationResult?.status === 'PENDING' ? 'default' : applicationResult?.status === 'OPEN' ? 'secondary' : 'destructive'}
                            className="w-fit"
                        >
                            {applicationResult?.status === 'Active' && <CheckCircle size={14} className="mr-1" />}
                            {applicationResult?.status === 'Rejected' && <XCircle size={14} className="mr-1" />}
                            {applicationResult?.status === 'Hired' && <Star size={14} className="mr-1" />}
                            {applicationResult?.status || 'Active'}
                        </Badge>

                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Message
                </button>
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
                        {stages.map(stage => (
                            <DropdownMenuItem key={stage.id}>
                                <Eye size={16} className="mr-2" />
                                {stage.stage_name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="destructive" className="gap-2">
                            <XCircle size={16} />
                            <span>Reject</span>
                            <ChevronDown size={16} />
                        </Button>
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
    );
};

export default AppicationHeader;
