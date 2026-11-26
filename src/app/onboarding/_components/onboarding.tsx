"use client";

import { AnimatePresence } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import Intro from "./intro";
import OnboardingStepper, { type OnboardingStepId } from "./onboarding-stepper";
import { PRODUCT_NAME } from "@/lib/marketing";
import { cn } from "@/lib/utils";
import AplikoMonogram from "./aplico-monogram";
import LiveStudioPreview from "./live-studio-preview";
import { useEffect, useState } from "react";
import Organization from "./organization";
import CreateOrganization from "./create-organization";
import AddOrganizationDepartment from "./add-organization-department";
import InviteMember from "./invite-member";
import JoinOrganization from "./join-organization";
import Success from "./success";
import { LoadingScreen } from "./loading-onboarding-screen";

type Props = {
    userId: string;
};

export type OnboardingStep =
    | 'intro'
    | 'organization'
    | 'create'
    | 'department'
    | 'invite'
    | 'join'
    | 'success';

export interface OnboardingProps {
    userId?: string;
    onComplete: (orgId: string) => void;
}

export interface InvitedMember {
    id: string;
    email: string;
    role: 'Recruiter' | 'Hiring Lead' | 'Interviewer';
}

const Onboarding = ({ userId }: Props) => {
    const params = useSearchParams();
    const router = useRouter();
    const step = params.get("step");
    const orgId = params.get("orgId");
    const [orgName, setOrgName] = useState(params.get("orgName") || '');
    const [subdomain, setSubdomain] = useState(params.get("subdomain") || '');
    const [newDept, setNewDept] = useState('');
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);
    const [isLoading, setIsLoading] = useState(step === null);

    // Map current step to clean 4-stage indicator
    const stepIndex = (() => {
        switch (step) {
            case 'intro':
                return 1;
            case 'organization':
            case 'create':
                return 2;
            case 'department':
            case 'join':
                return 3;
            case 'invite':
            case 'success':
                return 4;
            default:
                return 1;
        }
    })();

    // Stepper position. The join branch is an alternate path off Organization,
    // so it hides the stepper (current = null). Unknown steps fall back to intro.
    const stepper_step: OnboardingStepId | null =
        !step ? "intro"
            : step === "organization" ? "organization"
                : step === "create" ? "create"
                    : step === "department" ? "department"
                        : step === "invite" ? "invite"
                            : step === "success" ? "success"
                                : null;

    useEffect(() => {
        if (step !== null) return;
        const timer = setTimeout(() => {
            setIsLoading(false);
            router.push('/onboarding?step=intro');
        }, 2500);

        return () => clearTimeout(timer);
    }, [step]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <>
            {/* Top Bar: Clean Brand + Step Progress */}
            <header className="relative z-10 w-full max-w-[1360px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between gap-8">
                <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <AplikoMonogram className="w-8 h-8" />
                    <span className="font-['Plus_Jakarta_Sans'] font-bold text-lg tracking-tight text-foreground">
                        {PRODUCT_NAME}
                    </span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{stepper_step}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-foreground/70">
                            0{stepIndex} / 04
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5" aria-label={`Step ${stepIndex} of 4`}>
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className={cn(
                                    'h-1 w-6 rounded-full transition-colors duration-200',
                                    i <= stepIndex ? 'bg-foreground' : 'bg-foreground/15'
                                )}
                            />
                        ))}
                    </div>
                </div>
            </header>

            {/*<OnboardingStepper current={stepper_step} />*/}

            {/* Main Split Studio Stage */}
            <main className="relative z-10 flex-1 w-full max-w-[1360px] mx-auto px-6 lg:px-10 py-6 lg:py-10 flex items-center">
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                    {/* Left Interactive Configuration Column */}
                    <div className="lg:col-span-5 flex flex-col justify-center">
                        <AnimatePresence mode="wait">
                            {step === "intro" && <Intro key="intro" />}
                            {step === "organization" && <Organization key="organization" userId={userId} />}
                            {step === "create" &&
                                <CreateOrganization
                                    key="create"
                                    orgName={orgName}
                                    orgDomain={subdomain}
                                    onNameChange={setOrgName}
                                    onDomainChange={setSubdomain}
                                />}
                            {step === "department" && (
                                <AddOrganizationDepartment
                                    key="department"
                                    orgId={orgId}
                                    orgName={orgName}
                                    subdomain={subdomain}
                                    newDept={newDept}
                                    setNewDept={setNewDept}
                                    selectedDepartments={selectedDepartments}
                                    setSelectedDepartments={setSelectedDepartments}
                                />
                            )}
                            {step === "invite" && (
                                <InviteMember
                                    key="invite"
                                    orgId={orgId}
                                    orgName={orgName}
                                    subdomain={subdomain}
                                    invitedMembers={invitedMembers}
                                    setInvitedMembers={setInvitedMembers}
                                />
                            )}
                            {step === "join" && <JoinOrganization key="join" />}
                            {step === "success" && (
                                <Success key="success" orgId={orgId} orgName={orgName} subdomain={subdomain} departmentsCount={selectedDepartments.length} invitedCount={invitedMembers.length} />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Live Interactive Studio Canvas */}
                    <div className="lg:col-span-7 flex flex-col">
                        {<LiveStudioPreview
                            step={step as OnboardingStep}
                            orgName={orgName as string}
                            orgDomain={subdomain as string}
                            departments={selectedDepartments}
                            invitedMembers={invitedMembers}
                            onQuickStart={() => 'organization'}
                        />}
                    </div>
                </div>
            </main>
        </>
    );
};

export default Onboarding;
