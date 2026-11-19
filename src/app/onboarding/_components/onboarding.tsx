"use client";

import { AnimatePresence } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";
import Intro from "./intro";
import CreateOrganization from "./create-organization";
import Organization from "./organization";
import JoinOrganization from "./join-organization";
import Success from "./success";
import InviteMember from "@/app/onboarding/_components/invite-member";
import AddOrganizationDepartment from "@/app/onboarding/_components/add-organization-department";
import OnboardingStepper, { type OnboardingStepId } from "./onboarding-stepper";
import { PRODUCT_NAME } from "@/lib/marketing";

type Props = {
    userId: string;
};

const Onboarding = ({ userId }: Props) => {
    const params = useSearchParams();
    const step = params.get("step");
    const orgId = params.get("orgId");
    const orgName = params.get("orgName");
    const subdomain = params.get("subdomain");

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

    return (
        <div className="w-full max-w-xl space-y-6">
            <div className="flex items-center justify-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">{PRODUCT_NAME}</span>
            </div>

            <OnboardingStepper current={stepper_step} />

            <AnimatePresence mode="wait">
                {!step && <Intro key="intro" />}
                {step === "organization" && <Organization key="organization" userId={userId} />}
                {step === "create" && <CreateOrganization key="create" />}
                {step === "department" && (
                    <AddOrganizationDepartment
                        key="department"
                        orgId={orgId}
                        orgName={orgName}
                        subdomain={subdomain}
                    />
                )}
                {step === "invite" && (
                    <InviteMember key="invite" orgId={orgId} orgName={orgName} subdomain={subdomain} />
                )}
                {step === "join" && <JoinOrganization key="join" />}
                {step === "success" && (
                    <Success key="success" orgId={orgId} orgName={orgName} subdomain={subdomain} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Onboarding;
