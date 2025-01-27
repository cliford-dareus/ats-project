import React from 'react';
import {useNewJobContext} from "@/providers/new-job-provider";
import {Briefcase, Gem, MapPin} from "lucide-react";

const StepOneCollapse = ({}) => {
    const {newJobData} = useNewJobContext();

    return (
        <div className="border rounded flex flex-col w-full p-4 gap-2">
            <h2 className="font-semibold text-xl">{newJobData.jobInfo.job_name !== "" ? newJobData.jobInfo.job_name :"Job Name"}</h2>
            <div className="flex justify-between gap-4 w-full text-slate-500">
                <div className="flex gap-2 items-center">
                    <MapPin size={16}/>
                    <p>{newJobData.jobInfo.job_location !== "" ? newJobData.jobInfo.job_location :"Location"}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Gem size={16}/>
                    <p>{newJobData.jobInfo.salary_up_to !== "" ? newJobData.jobInfo.salary_up_to :"0000"}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Briefcase size={16}/>
                    <p>Department</p>
                </div>
            </div>
        </div>
    );
};

export default StepOneCollapse;