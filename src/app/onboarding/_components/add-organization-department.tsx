"use client"

import React, { useState, useTransition } from 'react';
import { ArrowLeft, Building, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { add_department_in_organization } from "@/server/actions/organization_actions";
import OnboardingLayout from './onboarding-layout';
import { DEPARTMENTS } from '@/lib/constant';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type Props = {
    orgName: string | null;
    orgId: string | null;
};

const AddOrganizationDepartment = ({ orgId, orgName }: Props) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [newDept, setNewDept] = useState('');
    const [isCreatePending, startCreateTransaction] = useTransition();

    const handleSelectDepartment = (department: string) => {
        setSelectedDepartments((prev) => {
            if (prev.includes(department)) {
                return prev.filter((d) => d !== department);
            }
            return [...prev, department];
        });
    };

    const addDept = () => {
        if (newDept.trim()) {
            setSelectedDepartments((prev) => [...prev, newDept.trim()]);
            setNewDept('');
        }
    };

    const onComplete = async () => {
        startCreateTransaction(async () => {
            if (selectedDepartments.length === 0) {
                alert('Please select at least one department.');
                return;
            };

            try {
                await add_department_in_organization({ departments: selectedDepartments, orgId: orgId! });
                
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("step", "invite");
                newSearchParams.set("orgId", orgId!);
                newSearchParams.set("orgName", orgName!);

                router.push(`/onboarding?${newSearchParams.toString()}`);
            } catch (error) {
                alert('Failed to add department: ' + error);
            }
        });
    };

    return (
        <OnboardingLayout
            title="Add Organization Department"
            subtitle="Select department that your organization is separate into."
            icon={Building}
        >
            <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                    {DEPARTMENTS.map((deps, index) => (
                        <Button
                            key={index}
                            onClick={() => handleSelectDepartment(deps)}
                            className={cn(`px-4 py-2 text-sm font-bold rounded-xl border border-brand-100 flex items-center gap-2 hover:text-white`, selectedDepartments.includes(deps) ? 'bg-primary text-white' : 'bg-zinc-100 text-zinc-600')}
                        >
                            {deps}
                        </Button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Input
                        type="text"
                        placeholder="Add department..."
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addDept()}
                        className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                    <Button
                        onClick={addDept}
                        className="p-3 bg-primary text-white rounded-xl hover:bg-brand-700 transition-all shadow-sm shadow-brand-500/20"
                    >
                        <Plus className="w-6 h-6" />
                    </Button>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button onClick={() => router.back()} className="p-4 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-200 transition-all">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <Button
                        onClick={onComplete}
                        disabled={isCreatePending}
                        className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
                    >
                        Save Departments
                    </Button>
                </div>
            </div>
        </OnboardingLayout>
    )
};

export default AddOrganizationDepartment;
