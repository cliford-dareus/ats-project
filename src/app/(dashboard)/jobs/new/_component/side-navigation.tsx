'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import { FileText, Users, Workflow, Eye, Check} from "lucide-react";
import {cn} from "@/lib/utils";
import {useNewJobContext} from "@/providers/new-job-provider";

const steps = [
    {
        index: '01',
        title: 'Job Details',
        route: 'step-one',
        icon: <FileText size={14}/>,
        link: '/jobs/new/step-one',
        description: 'Basic job information'
    },
    {
        index: '02',
        title: "Requirements",
        route: 'step-two',
        icon: <Users size={14}/>,
        link: '/jobs/new/step-two',
        description: 'Skills and experience'
    },
    {
        index: '03',
        title: 'Workflow',
        route: 'step-three',
        icon: <Workflow size={14}/>,
        link: '/jobs/new/step-three',
        description: 'Hiring pipeline'
    },
    {
        index: '04',
        title: 'Review',
        route: 'step-review',
        icon: <Eye size={14}/>,
        link: '/jobs/new/step-review',
        description: 'Final review'
    },
];

const SideNavigation = () => {
    const pathname = usePathname();
    const [currentStep, setCurrentStep] = useState(0);
    const {newJobData} = useNewJobContext();

    useEffect(() => {
        const step = steps.findIndex(step => pathname.includes(step.route));
        setCurrentStep(step !== -1 ? step : 0);
    }, [pathname]);

    const isStepCompleted = (stepIndex: number) => {
        switch (stepIndex) {
            case 0:
                return newJobData.jobInfo.job_name && newJobData.jobInfo.job_description;
            case 1:
                return newJobData.jobTechnology.length > 0;
            case 2:
                return newJobData.jobStages.length > 0;
            default:
                return false;
        }
    };

    return (
        <aside className=" px-4">
            {/* Progress Steps */}
            <div className="space-y-4">
                {steps.map((step, index) => {
                    const isActive = currentStep === index;
                    const isCompleted = isStepCompleted(index);
                    const isAccessible = index <= currentStep || isCompleted;

                    return (
                        <div key={step.route} className="relative my-4">
                            <Link
                                href={isAccessible ? step.link : '#'}
                                className={cn(
                                    "block transition-all duration-200",
                                )}
                            >
                                <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors min-w-[170px] lg:min-w-0 lg:w-full cursor-pointer",
                                    isActive
                                        ? 'bg-blue-50/80 text-blue-900'
                                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                )}>
                                    <div className={cn(
                                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0 border text-xs font-mono tabular-nums transition-colors",
                                        isActive
                                            ? "bg-blue-500 border-blue-500 text-white"
                                            : isCompleted
                                                ? "bg-green-500 border-green-500 text-white"
                                                : isAccessible
                                                    ? "bg-card border-border text-muted-foreground"
                                                    : "bg-muted border-border text-muted-foreground"
                                    )}>
                                        {isCompleted ? <Check size={18}/> : step.icon}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className={cn(
                                            "text-sm font-medium leading-tight truncate",
                                        )}>
                                            {step.index}. {step.title}
                                        </h3>
                                        <p className={cn(
                                            "text-xs text-slate-500 truncate mt-0.5 hidden lg:block",
                                        )}>
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </div>

            {/*Progress Bar */}
            <div className="mt-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                    <span className="">Progress</span>
                    <span className="font-mono tabular-nums text-slate-900 font-semibold">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-700 transition-all duration-300"
                        style={{width: `${((currentStep + 1) / steps.length) * 100}%`}}
                    />
                </div>
                <p className="mt-2.5 text-xs text-slate-500 tabular-nums">
                    {currentStep + 1} of {steps.length - 1} required checkpoints complete
                </p>
            </div>
        </aside>
    );
};

export default SideNavigation;
