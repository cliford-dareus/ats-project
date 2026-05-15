import {ApplicationType, StageResponseType} from "@/types";
import Kanban from "@/app/(dashboard)/jobs/[joblistingId]/_components/kanban";

type Props = {
    data: ApplicationType[];
    stages: StageResponseType[];
    jobDetails: {jobId: number, jobName: string, department: string}
};

const JobPipeline = ({data, stages, jobDetails}: Props) => {
    return (
        <div className="h-[calc(100vh-280px)] overflow-hidden">
            <Kanban stages={stages} data={data} jobDetails={jobDetails}/>
        </div>
    );
};

export default JobPipeline;
