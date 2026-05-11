"use client";

import { AnimatePresence } from "motion/react";
import { useSearchParams } from "next/navigation";
import Intro from "./intro";
import CreateOrganization from "./create-organization";
import Organization from "./organization";
import JoinOrganization from "./join-organization";
import Success from "./success";
import InviteMember from "@/app/onboarding/_components/invite-member";
import AddOrganizationDepartment from "@/app/onboarding/_components/add-organization-department";

type Props = {
    userId: string;
};

const Onboarding = ({ userId }: Props) => {
    const params = useSearchParams();
    const step = params.get("step");
    const orgId = params.get("orgId");
    const orgName = params.get("orgName");

    return (
        <div className="w-full max-w-xl">
            <AnimatePresence mode="wait">
                {!step && <Intro key="intro" />}
                {step === "organization" && <Organization userId={userId} />}
                {step === "create" && <CreateOrganization userId={userId} />}
                {step === "department" && <AddOrganizationDepartment orgId={orgId} orgName={orgName} />}
                {step === "invite" && <InviteMember orgId={orgId} orgName={orgName} />}
                {step === "join" && <JoinOrganization userId={userId} />}
                {step === "success" && <Success orgId={orgId} />}
            </AnimatePresence>
        </div>
    );
};

export default Onboarding;
