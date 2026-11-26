import React, { useEffect, useState } from 'react';
import { useNewJobContext } from "@/providers/new-job-provider";
import { Briefcase } from "lucide-react";
import { formatSalaryRange } from "@/lib/format-salary-range";

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
            <div className="relative  space-y-4 p-6 rounded-md overflow-hidden">
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl "></div>
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-brand-400" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Job Overview</h3>
                </div>
                <div>
                    <p className="text-lg font-bold leading-tight">{newJobData.jobInfo.job_name !== "" ? newJobData.jobInfo.job_name : "Job Name"}</p>
                    <p className="text-muted-foreground text-sm uppercase">{department ?? "DEPARTMENT"}</p>
                </div>
                <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-medium">{newJobData.jobInfo.job_location !== "" ? newJobData.jobInfo.job_location : "Location"}</span>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium">{newJobData.jobInfo.job_type ? newJobData.jobInfo.job_type : "Full-Time"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Salary</span>
                        <span className="font-medium">{formatSalaryRange(newJobData.jobInfo.salary_from, newJobData.jobInfo.salary_up_to) || "$0000"}</span>
                    </div>
                </div>

                {/* Decorative background element */}
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
};

export default StepOneCollapse;
