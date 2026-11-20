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
        <div className="relative min-h-screen w-full bg-background text-foreground antialiased">
            {/* Subtle architectural grid & ambient glow */}
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:64px_64px]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none fixed top-[-18%] right-[8%] w-[520px] h-[520px] rounded-full bg-primary/[0.08] blur-[140px]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none fixed bottom-[-18%] left-[4%] w-[420px] h-[420px] rounded-full bg-accent/[0.05] blur-[140px]"
            />
            <div className="relative z-10 flex min-h-screen flex-col p-6 py-12">
                <Onboarding userId={userId} />
            </div>
        </div>
    );
};

export default Page;
