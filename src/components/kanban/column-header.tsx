import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { EllipsisVertical, WandSparkles } from "lucide-react";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";
import { ApplicationType } from "@/types";
import { JOB_STAGES } from "@/zod";
import { z } from "zod";

type Props = {
    stage: z.infer<typeof JOB_STAGES> | null;
    color: string | null;
    filteredCards: ApplicationType[];
    openModal: () => void;
    hasSmartTrigger: boolean;
    setShowTriggers: React.Dispatch<React.SetStateAction<boolean>>;
    setOpenSmartMove: React.Dispatch<React.SetStateAction<{
        type: string;
        stage: string;
        action_type: string;
    }>>;
};

const ColumnHeader = ({ stage, color, filteredCards, openModal, hasSmartTrigger, setShowTriggers, setOpenSmartMove }: Props) => {

    return (
        <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                {color && <div className={cn(color, "h-3 w-3 rounded-full")} />}
                <p className="font-medium text-slate-600 text-sm">{stage}</p>
                <Badge variant="secondary" className="text-xs">
                    {filteredCards.length}
                </Badge>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <WandSparkles
                            size={18}
                            className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
                            onClick={() => setShowTriggers((prev) => !prev)}
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        {hasSmartTrigger ? "Toggle Smart Triggers" : "Smart Triggers plugin not enabled"}
                    </TooltipContent>
                </Tooltip>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <EllipsisVertical size={18} className="text-slate-400 cursor-pointer -mr-1" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem>View</DropdownMenuItem>
                    <DropdownMenuItem>Sort</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Trigger</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            openModal();
                                            setOpenSmartMove({ type: "email", stage: stage.stage_name!, action_type: "EMAIL" });
                                        }}
                                    >
                                        Smart Email
                                    </DropdownMenuItem>

                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Smart Move</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                {["location", "experience", "score"].map((type) => (
                                                    <DropdownMenuItem
                                                        key={type}
                                                        onClick={() => {
                                                            openModal();
                                                            setOpenSmartMove({
                                                                type,
                                                                stage: stage.stage_name!,
                                                                action_type: "MOVE",
                                                            });
                                                        }}
                                                    >
                                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                                    </DropdownMenuItem>
                                                ))}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>More...</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    
                                    <DropdownMenuItem onClick={() => {
                                        openModal()
                                        setOpenSmartMove({ type: "note", stage: stage.stage_name!, action_type: "NOTE" })
                                    }}>Smart Note</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {}}>Smart Schedule</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuItem>Add to Calendar</DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default ColumnHeader;
