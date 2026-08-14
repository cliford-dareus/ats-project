import React, { useEffect, useState } from 'react';
import { useNewJobContext } from "@/providers/new-job-provider";
import { Briefcase } from "lucide-react";

type Props = {
    departments: { id: number, organization_id: string, name: string | null }[]
};

const StepOneCollapse = ({ departments }: Props) => {
    const [department, setDepartment] = useState("")
    const { newJobData } = useNewJobContext();

    useEffect(() => {
        if (!departments) return;
        const dep = departments.find(d => d.id == Number(newJobData.jobInfo.department));
        if (!dep || !dep.name) return;
        setDepartment(dep.name);
    }, [newJobData, departments])

    return (
        <div className="max-w-[450px] flex-1">
            <div className="relative bg-foreground rounded-2xl p-6 text-white space-y-4">
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-brand-400" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Job Overview</h3>
                </div>
                <div>
                    <p className="text-lg font-bold leading-tight">{newJobData.jobInfo.job_name !== "" ? newJobData.jobInfo.job_name : "Job Name"}</p>
                    <p className="text-zinc-400 text-sm uppercase">{department ?? "DEPARTMENT"}</p>
                </div>
                <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Location</span>
                        <span className="font-medium">{newJobData.jobInfo.job_location !== "" ? newJobData.jobInfo.job_location : "Location"}</span>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                        <span className="text-zinc-500">Type</span>
                        <span className="font-medium">{newJobData.jobInfo.job_type ? newJobData.jobInfo.job_type : "Full-Time"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Salary</span>
                        <span className="font-medium">${newJobData.jobInfo.salary_up_to !== "" ? newJobData.jobInfo.salary_up_to : "0000"}</span>
                    </div>
                </div>

                {/* Decorative background element */}
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
};

export default StepOneCollapse;
