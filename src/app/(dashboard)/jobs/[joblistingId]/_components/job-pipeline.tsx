import {ApplicationType, StageResponseType} from "@/types";
import Kanban from "@/app/(dashboard)/jobs/[joblistingId]/_components/kanban";

type Props = {
    data: ApplicationType[];
    stages: StageResponseType[];
};

const JobPipeline = ({data, stages}: Props) => {
    return (
        <div className="h-[calc(100vh-200px)]">
            <Kanban stages={stages} data={data}/>
        </div>
    );
};

export default JobPipeline;
