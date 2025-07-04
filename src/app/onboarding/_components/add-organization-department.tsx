"use client"

import React, {useEffect, useState, useTransition} from 'react';
import {motion} from "motion/react"
import {ArrowLeft, LucideCornerDownLeft, LucidePlus} from "lucide-react";
import {useRouter} from "next/navigation";
import {useDebounce} from "@/hooks/use-debounce";
import {Button} from "@/components/ui/button";
import {cn, DEPARTMENTS} from "@/lib/utils";
import {add_department_in_organization} from "@/server/actions/organization_actions";

type Props = {
    orgName: string | null;
    orgId: string | null;
};

const AddOrganizationDepartment = ({orgId, orgName}: Props) => {
    const showText = useDebounce(true, 800);
    const router = useRouter();
    const [selectedDepartments, setSelectedDepartments] = useState<{
        id: number,
        name: string,
        isSelected: boolean
    }[]>([]);
    const [isCreatePending, startCreateTransaction] = useTransition();

    const add = async () => {
        startCreateTransaction(async () => {
            const deps = selectedDepartments
                .filter((dep) => dep.isSelected)
                .map((dep) => dep.name);
            await add_department_in_organization({departments: deps, orgId: orgId!});
            router.push(`/onboarding?step=invite&orgId=${orgId}&orgName=${orgName}`);
        });
    };

    useEffect(() => {
        const formatedDepartment = DEPARTMENTS.map((dep, index) => {
            return {id: index, name: dep, isSelected: false}
        });
        setSelectedDepartments(formatedDepartment);
    }, []);

    return (
        <motion.div
            className="flex flex-col h-screen p-4 container mx-auto"
            exit={{opacity: 0, scale: 0.95}}
            transition={{duration: 0.3, type: "spring"}}
        >
            {showText && (
                <motion.div
                    className="mt-auto pb-5 w-full flex items-center"
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
                    <motion.div className="w-[50%] flex flex-col gap-4">
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
                        <motion.p
                            className="text-muted-foreground"
                        >
                            Select department that your {orgName} is separate into.
                        </motion.p>
                        <div className="flex gap-4">
                            <div className="flex gap-2 flex-wrap">
                                {selectedDepartments.map((department) => (
                                    <div
                                        key={department.id}
                                        className={cn("flex justify-center items-center px-5 rounded-md border border-blue-400 cursor-pointer text-2xl", department.isSelected ? "bg-red-300" : "")}
                                        onClick={() => {
                                            setSelectedDepartments(prev => {
                                                return prev.map(dep =>
                                                    dep.id === department.id
                                                        ? {...dep, isSelected: !dep.isSelected}
                                                        : dep
                                                );
                                            });
                                        }}
                                    >
                                        {department.name}
                                    </div>
                                ))}
                            </div>
                            <Button><LucidePlus /></Button>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                disabled={isCreatePending}
                                className="rounded-full bg-blue-400 px-10"
                                onClick={add}
                            >
                                Next
                            </Button>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <LucideCornerDownLeft size={16}/>
                                <span className=" text-sm">Or press Enter</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>)}
        </motion.div>
    )
};

export default AddOrganizationDepartment;