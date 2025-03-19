"use client";

import { AnimatePresence } from "motion/react";
import { useSearchParams } from "next/navigation";
import Intro from "./intro";
import CreateOrganization from "./create-organization";
import Organization from "./organization";
import JoinOrganization from "./join-organization";
import Success from "./success";

type Props = {
  userId: string;
};

const Onboarding = ({ userId }: Props) => {
  const params = useSearchParams();
  const step = params.get("step");
  const orgId = params.get("orgId");

  return (
    <AnimatePresence mode="wait">
      {!step && <Intro key="intro" />}
      {step === "organization" && <Organization userId={userId} />}
      {step === "create" && <CreateOrganization userId={userId} />}
      {step === "join" && <JoinOrganization userId={userId} />}
      {step === "success" && <Success orgId={orgId} />}
    </AnimatePresence>
  );
};

export default Onboarding;
