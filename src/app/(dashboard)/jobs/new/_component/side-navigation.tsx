'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {ArrowLeft, FileText, Users, Workflow, Eye, Check} from "lucide-react";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {useNewJobContext} from "@/providers/new-job-provider";

const steps = [
    {
        title: 'Job Details',
        route: 'step-one',
        icon: <FileText size={14}/>,
        link: '/jobs/new/step-one',
        description: 'Basic job information'
    },
    {
        title: "Requirements",
        route: 'step-two',
        icon: <Users size={14}/>,
        link: '/jobs/new/step-two',
        description: 'Skills and experience'
    },
    {
        title: 'Workflow',
        route: 'step-three',
        icon: <Workflow size={14}/>,
        link: '/jobs/new/step-three',
        description: 'Hiring pipeline'
    },
    {
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
        ;
    };

    return (
        <div className=" px-4">
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
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors",
                                        isActive
                                            ? "bg-blue-500 border-blue-500 text-white"
                                            : isCompleted
                                                ? "bg-green-500 border-green-500 text-white"
                                                : isAccessible
                                                    ? "bg-white border-gray-300 text-gray-600"
                                                    : "bg-gray-100 border-gray-200 text-gray-400"
                                    )}>
                                        {isCompleted ? <Check size={10}/> : step.icon}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className={cn(
                                            "font-medium text-sm leading-none",
                                        )}>
                                            {step.title}
                                        </h3>
                                        <p className={cn(
                                            "text-xs mt-1 text-zinc-400",
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

            {/* Progress Bar */}
            {/*<div className="mt-2">*/}
            {/*    <div className="flex justify-between text-sm text-gray-600">*/}
            {/*        <span>Progress</span>*/}
            {/*        <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>*/}
            {/*    </div>*/}
            {/*    <div className="w-full bg-gray-200 rounded-full h-2">*/}
            {/*        <div*/}
            {/*            className="bg-blue-500 h-2 rounded-full transition-all duration-300"*/}
            {/*            style={{width: `${((currentStep + 1) / steps.length) * 100}%`}}*/}
            {/*        />*/}
            {/*    </div>*/}
            {/*</div>*/}
        </div>
    );
};

export default SideNavigation;
