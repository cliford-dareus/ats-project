import Column from "@/components/kanban/column";
import { useEffect, useState } from "react";
import { ApplicationType, StageResponseType } from "@/types";
import { useSmartTriggers } from "@/hooks/use-smart-trigger";

type Props = {
    data: ApplicationType[];
    stages: StageResponseType[];
    jobDetails: { jobName: string, department: string }
};

const Kanban = ({ data, stages, jobDetails }: Props) => {
    const [jobs, setJobs] = useState<ApplicationType[]>();
    const [showTriggers, setShowTriggers] = useState(false);
    const { isEnabled, triggerAction, stages: Tstages } = useSmartTriggers(data[0].job_id, data[0].organization);

    useEffect(() => {
        setJobs(data)
    }, [data]);

    return (
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
                    triggerAction={triggerAction}
                    isEnabled={isEnabled}
                    stages={Tstages}
                />
            ))}
        </div>
    )
};

export default Kanban;
