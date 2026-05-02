import React from 'react';
import {useNewJobContext} from "@/providers/new-job-provider";
import {Briefcase, Gem, MapPin} from "lucide-react";

const  StepOneCollapse = ({}) => {
    const {newJobData} = useNewJobContext();

    return (
        <div className="max-w-[450px] flex-1">
            <div className="bg-zinc-900 rounded-2xl p-6 text-white space-y-4">
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-brand-400" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Job Overview</h3>
                </div>
                <div>
                    <p className="text-lg font-bold leading-tight">{newJobData.jobInfo.job_name !== "" ? newJobData.jobInfo.job_name :"Job Name"}</p>
                    <p className="text-zinc-400 text-sm">Department</p>
                </div>
                <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Location</span>
                        <span className="font-medium">{newJobData.jobInfo.job_location !== "" ? newJobData.jobInfo.job_location :"Location"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Type</span>
                        <span className="font-medium">{newJobData.jobInfo.salary_up_to !== "" ? newJobData.jobInfo.salary_up_to :"0000"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepOneCollapse;