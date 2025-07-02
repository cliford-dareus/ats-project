"use client"

import React, {useEffect, useState, useTransition} from 'react';
import {motion} from "motion/react"
import {ArrowLeft} from "lucide-react";
import {useRouter} from "next/navigation";
import {useDebounce} from "@/hooks/use-debounce";

type Props = {
    orgName: string | null;
    orgId: string | null;
};

const DEPARTMENTS = [
    "HR",
    "CLERK",
    "TEACHER"
];

const AddOrganizationDepartment = ({orgId, orgName}: Props) => {
    const showText = useDebounce(true, 800);
    const router= useRouter();
    const [departments, setDepartments] = useState<string[]>([])
    const [isCreatePending, startCreateTransaction] = useTransition();

    const add = async () => {
        startCreateTransaction(async () => {
           console.log('ADD')
        });
    };

    useEffect(() => {

    }, [])

    return (
        <motion.div
            className="flex flex-col h-screen p-4 container mx-auto"
            exit={{opacity: 0, scale: 0.95}}
            transition={{duration: 0.3, type: "spring"}}
        >
            {showText && (
                <motion.div
                    className="mt-[40%] w-full flex items-center"
                    variants={{
                        show: {
                            transition: {
                                staggerChildren: 0.2,
                            },
                        },
                    }}
                    initial="hidden"
                    animate="show"
                >
                    <motion.div className="w-[40%] flex flex-col gap-4">
                        <span
                            onClick={() => router.back()}
                            className="text-muted-foreground flex items-center gap-2 cursor-pointer"
                        >
                          <ArrowLeft size={16}/> Back
                        </span>
                        <motion.h1
                            className="text-balance text-2xl font-bold text-blue-900"
                            variants={{
                                hidden: {opacity: 0, y: 50},
                                show: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {duration: 0.4, type: "spring"},
                                },
                            }}
                        >
                            {orgName ?? "Bridge"}
                        </motion.h1>
                    </motion.div>
                </motion.div>)}
        </motion.div>
    )
};

export default AddOrganizationDepartment;