import { Hero } from "./_components/landing/hero";
import { PipelineDemo } from "./_components/landing/pipeline-demo";
import { ScreeningSandbox } from "./_components/landing/screening-sandbox";
import { FeatureGrid } from "./_components/landing/feature-grid";
import { Faq } from "./_components/landing/faq";
import { Cta } from "./_components/landing/cta";

const HomePage = () => {
    return (
        <>
            <Hero />
            <PipelineDemo />
            <ScreeningSandbox />
            <FeatureGrid />
            <Faq />
            <Cta />
        </>
    );
};

export default HomePage;
