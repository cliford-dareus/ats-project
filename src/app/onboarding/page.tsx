import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Onboarding from "./_components/onboarding";

const Page = async () => {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    return (
        <div className="relative min-h-screen w-full bg-background antialiased">
            {/* Subtle top glow, token-based so it works in light and dark mode */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/[0.07] to-transparent" />
            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6 py-12">
                <Onboarding userId={userId} />
            </div>
        </div>
    );
};

export default Page;
