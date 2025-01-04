import {candidatesResponseType} from "@/types/job-listings-types";
import {Badge} from "@/components/ui/badge";
import {StageCountType} from "@/app/(dashboard)/layout";
import {aggregateByKey} from "@/lib/utils";
import {Separator} from "@/components/ui/separator";

const SidebarCandidate = ({candidate, stagescount}: {
    candidate: candidatesResponseType[],
    stagescount: StageCountType[]
}) => {
    const statusArray = aggregateByKey(candidate.map(c => ({...c, count: 1})), "status", "count")
    const stagesArray = aggregateByKey(stagescount, "stages", "count")

    return (
        <div className="flex flex-col">
            <>
                <div className="px-4">
                    <span className="font-medium text-base ">Stages</span>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                    {stagesArray.length > 0 && stagesArray.map((item, i) => (
                        <div
                            className="flex items-center justify-between px-4 py-2 rounded hover:bg-muted cursor-pointer"
                            key={i}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-[10px] h-[10px] rounded-full bg-destructive"
                                ></span>
                                <span>{item.stages}</span>
                            </div>
                            <Badge>{item.count}</Badge>
                        </div>
                    ))}
                </div>
            </>

            <Separator className="my-8"/>

            <>
                <div className="px-4">
                    <span className="font-medium text-base">Status</span>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                    {statusArray.length > 0 && statusArray.map((item, i) => (
                        <div
                            className="flex items-center justify-between px-4 py-2 rounded hover:bg-muted cursor-pointer"
                            key={i}>
                            <div className="flex items-center gap-2">
                                <span className="w-[10px] h-[10px] rounded-full bg-destructive"></span>
                                <span>{item.status}</span>
                            </div>
                            <Badge>{item.count}</Badge>
                        </div>
                    ))}
                </div>
            </>
        </div>

    );
};

export default SidebarCandidate;