import {candidatesResponseType } from "@/types/job-listings-types";
import {Badge} from "@/components/ui/badge";

const SidebarCandidate = ({candidate}: { candidate: candidatesResponseType[]}) => {
    const statusArray = (candidate as candidatesResponseType[]).reduce((acc, cur) => {
        if (cur.status === null) {
            return acc;
        }

        const existingStatus = acc.find(item => item.status === cur.status);
        if (existingStatus) {
            existingStatus.count += 1;
        } else {
            acc.push({status: cur.status, count: 1});
        }
        return acc;
    }, [] as { status: string; count: number }[]);

    return (
        <div className="p-4">
            <div className="">
                <span className="font-medium text-xl">Stage</span>
            </div>
            <div className="flex flex-col gap-2 mt-4">
                {statusArray.length > 0 && statusArray.map((item, i) => (
                    <div className="flex items-center justify-between px-2 py-2 rounded hover:bg-muted cursor-pointer" key={i}>
                        <div className="flex items-center gap-2">
                            <span className="w-[10px] h-[10px] rounded-full bg-destructive"></span>
                            <span>{item.status}</span>
                        </div>
                        <Badge>{item.count}</Badge>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SidebarCandidate;