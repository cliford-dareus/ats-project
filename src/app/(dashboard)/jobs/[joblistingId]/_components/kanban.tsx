import Column from "@/components/kanban/column";
import {useEffect, useState} from "react";
import {ApplicationType, StageResponseType} from "@/types";

type Props = {
    data: ApplicationType[];
    stages: StageResponseType[];
    jobDetails: {jobName: string, department: string}
};

const Kanban = ({data, stages, jobDetails}: Props) => {
    const [jobs, setJobs] = useState<ApplicationType[]>();
    const [showTriggers, setShowTriggers] = useState(false);

    useEffect(() => {
        setJobs(data)
    }, []);

    return(
        <div className="flex h-full gap-4 overflow-y-hidden overflow-x-scroll">
            {stages?.map((stage) => (
                <Column
                    key={stage.stage_order_id}
                    title={stage.stage_name as string}
                    column={stage.stage_name!}
                    stage={stage}
                    cards={jobs! ?? data}
                    jobId={data[0].job_id}
                    jobDetails={jobDetails}
                    color={stage.color}
                    setCards={setJobs}
                    showTriggers={showTriggers}
                    setShowTriggers={setShowTriggers}
                />
            ))}
        </div>
    )
};

export default Kanban;