"use client"

import React, { useState, useTransition } from 'react';
import { AlertCircle, ArrowLeft, Building, Plus, Check, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { add_department_in_organization } from "@/server/actions/organization_actions";
import OnboardingLayout from './onboarding-layout';
import { DEPARTMENTS, DEPARTMENT_PRESETS } from '@/lib/constant';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { motion } from "framer-motion";


type Props = {
    orgName: string | null;
    orgId: string | null;
    subdomain: string | null;
    newDept: string;
    setNewDept: React.Dispatch<React.SetStateAction<string>>;
};

const AddOrganizationDepartment = ({ orgId, orgName, subdomain, newDept, setNewDept }: Props) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isCreatePending, startCreateTransaction] = useTransition();

    const handleSelectDepartment = (department: string) => {
        setError(null);
        setSelectedDepartments((prev) => {
            if (prev.includes(department)) {
                return prev.filter((d) => d !== department);
            }
            return [...prev, department];
        });
    };

    const addDept = () => {
        if (newDept.trim()) {
            setError(null);
            setSelectedDepartments((prev) => [...prev, newDept.trim()]);
            setNewDept('');
        }
    };

    const onComplete = async () => {
        startCreateTransaction(async () => {
            if (selectedDepartments.length === 0) {
                setError('Please select at least one department.');
                return;
            };

            try {
                await add_department_in_organization({ departments: selectedDepartments, orgId: orgId! });

                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("step", "invite");
                newSearchParams.set("orgId", orgId!);
                newSearchParams.set("orgName", orgName!);
                if (subdomain) {
                    newSearchParams.set("subdomain", subdomain);
                }

                router.push(`/onboarding?${newSearchParams.toString()}`);
            } catch (error) {
                setError('Failed to add departments. Please try again.');
                console.error(error);
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-7"
        >
            <div className="space-y-2">
                <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-foreground [text-wrap:balance]">
                    Departments at {orgName}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Select functional teams to organize open requisitions and career portal filters.
                </p>
            </div>

            {/* Interactive Department Controls */}
            <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                    Active teams · <span className="tabular-nums text-foreground/70">{departments.length}</span> selected
                </p>
                <div className="flex flex-wrap gap-2">
                    {Array.from(new Set([...DEPARTMENT_PRESETS, ...departments])).map((dept) => {
                        const isSelected = departments.includes(dept);
                        return (
                            <button
                                key={dept}
                                type="button"
                                onClick={() => togglePreset(dept)}
                                className={cn(
                                    'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 border',
                                    isSelected
                                        ? 'bg-primary/15 border-primary/50 text-primary'
                                        : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-border'
                                )}
                            >
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                <span>{dept}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Custom department input */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Add custom department..."
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomDept();
                        }
                    }}
                    className="flex-1 px-4 py-3 bg-card border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <button
                    type="button"
                    onClick={addCustomDept}
                    disabled={!newDept.trim()}
                    className="px-4 py-3 bg-secondary border border-border text-foreground rounded-xl hover:border-primary/50 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0 text-xs font-semibold flex items-center gap-1.5"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                </button>
            </div>

            <div className="flex items-center gap-3 pt-1">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Go back"
                    className="p-3.5 bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border rounded-xl transition-colors cursor-pointer shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={onComplete}
                    className="flex-1 py-3.5 px-6 bg-foreground text-background rounded-xl font-semibold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                    <span>Save Departments</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    )
};

export default AddOrganizationDepartment;
