import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Onboarding from "./_components/onboarding";
import { BackgroundBeams } from "@/components/ui/background-beams";

const Page = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  return (
    <div className="h-screen w-full rounded-md relative antialiased">
      <div className="relative z-10">
        <Onboarding userId={userId} />
      </div>
      <BackgroundBeams />
    </div>
  );
};

export default Page;
