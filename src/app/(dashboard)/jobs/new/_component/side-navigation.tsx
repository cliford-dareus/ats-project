'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import path from 'path';
import {useEffect, useState} from 'react';
import {ArrowLeft, FileArchive} from "lucide-react";
import {cn} from "@/lib/utils";
// import { newJobRoutes } from '@/types';

const steps = [
    {
        title: 'Job Information',
        route: 'step-one',
        icon: <FileArchive size={20}/>,
        link: '/jobs/new/step-one',
    },
    {
        title: "Experience",
        route: 'step-two',
        icon: <FileArchive size={20}/>,
        link: '/jobs/new/step-two',
    },
    {
        title: 'Workflow ',
        route: 'step-three',
        icon: <FileArchive size={20}/>,
        link: '/jobs/new/step-three',
    },
    {title: 'Review', route: 'review', icon: <FileArchive size={20}/>, link: '/jobs/new/review'},
];

export default function StepNavigation() {
    const pathname = usePathname();
    const currentPath = path.basename(pathname);
    const [currentStep, setCurrentStep] = useState(1);

    useEffect(() => {
        setCurrentStep(steps.findIndex((step) => step.route === currentPath));
    }, [currentPath]);

    return (
        <div className="flex flex-col justify-center h-full">
            <div className="p-4">
                <Link href="" className="text-slate-500 flex items-center gap-4">
                    <ArrowLeft size={20}/>
                    Back to Dashboard
                </Link>
            </div>
            <div className="my-36">
                {steps.map((step) => (
                    <Link
                        className={cn("flex items-center justify-between px-4 py-2 hover:bg-muted cursor-pointer",
                            currentPath == step.route ? "bg-blue-200" : "")}
                        key={step.link}
                        href={step.link}
                    >
                        <div className="flex items-center gap-4">
                            {step.icon}
                            <span>{step.title}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};