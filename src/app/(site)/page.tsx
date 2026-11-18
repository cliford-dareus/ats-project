"use client";

import { useRouter } from "next/navigation";
import { Hero } from "./_components/landing/hero";
import { PipelineDemo } from "./_components/landing/pipeline-demo";
import { ScreeningSandbox } from "./_components/landing/screening-sandbox";
import { FeatureGrid } from "./_components/landing/feature-grid";
import { Faq } from "./_components/landing/faq";
import { Cta } from "./_components/landing/cta";

const HomePage = () => {
    const router = useRouter();

    const scrollToPipeline = () => {
        document.getElementById("pipeline")?.scrollIntoView({ behavior: "smooth" });
    };

    // Trial CTAs go to sign-up (same destination as the site header's
    // "Start free"); demo CTAs scroll to the interactive pipeline demo.
    const handleOpenDemo = (mode?: 'demo' | 'trial') => {
        if (mode === 'trial') {
            router.push("/sign-up");
            return;
        }
        scrollToPipeline();
    };

    return (
        <>
            <Hero onOpenDemo={handleOpenDemo} onExploreDemo={scrollToPipeline} />
            <PipelineDemo onOpenDemo={handleOpenDemo} />
            <ScreeningSandbox />
            <FeatureGrid />
            <Faq />
            <Cta onOpenDemo={handleOpenDemo} />
        </>
    );
};

export default HomePage;
