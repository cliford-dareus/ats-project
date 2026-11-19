"use client"

import React, { useState, useTransition } from 'react';
import { AlertCircle, ArrowLeft, Building, Plus } from "lucide-react";
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
    subdomain: string | null;
};

const AddOrganizationDepartment = ({ orgId, orgName, subdomain }: Props) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [newDept, setNewDept] = useState('');
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
        <OnboardingLayout
            title="Add Organization Department"
            subtitle="Choose the departments your organization is divided into. You can change these later in settings."
            icon={Building}
        >
            <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                    {DEPARTMENTS.map((deps, index) => (
                        <Button
                            key={index}
                            variant="outline"
                            onClick={() => handleSelectDepartment(deps)}
                            className={cn(
                                "px-4 py-2 text-sm font-semibold rounded-xl border flex items-center gap-2",
                                selectedDepartments.includes(deps)
                                    ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground'
                                    : 'bg-muted text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                            )}
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
                        className="h-12 flex-1 rounded-xl"
                    />
                    <Button
                        onClick={addDept}
                        size="icon"
                        aria-label="Add department"
                        className="h-12 w-12 shrink-0 rounded-xl"
                    >
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>

                {error && (
                    <p role="alert" className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-12 w-12 shrink-0 rounded-xl"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Button
                        onClick={onComplete}
                        disabled={isCreatePending || selectedDepartments.length === 0}
                        className="h-12 flex-1 rounded-xl text-base font-semibold"
                    >
                        Save Departments
                    </Button>
                </div>
                {selectedDepartments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                        Select at least one department to continue
                    </p>
                )}
            </div>
        </OnboardingLayout>
    )
};

export default AddOrganizationDepartment;
