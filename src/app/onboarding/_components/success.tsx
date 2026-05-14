import { redirect, useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import OnboardingLayout from "./onboarding-layout";
import { CheckCircle2, Zap } from "lucide-react";

const Success = ({ orgId }: { orgId: string | null }) => {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const onFinish = () => {
        startTransition(() => {
            redirect(`http://app.localhost:3000/dashboard`);
        });
    };

    useEffect(() => {
        if (!orgId) {
            router.push("/onboarding")
        }
    }, [router, orgId]);

    return (
        <OnboardingLayout
            title="You're all set!"
            subtitle="Your organization is ready. Start by posting your first job opening."
            icon={CheckCircle2}
            colorClass="bg-emerald-50 text-emerald-600"
        >
            <div className="space-y-4">
                <div className="w-full aspect-video bg-zinc-50 rounded-[32px] border border-zinc-100 flex items-center justify-center p-8 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent"></div>
                    <div className="relative space-y-2">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-lg border border-zinc-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <Zap className="w-6 h-6 text-brand-500" />
                        </div>
                        <p className="font-bold text-zinc-900">Get 10x more applicants</p>
                        <p className="text-xs text-zinc-500">Share your career portal on LinkedIn and Twitter with one click.</p>
                    </div>
                </div>
                <button
                    onClick={onFinish}
                    className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
                >
                    Take me to Dashboard
                </button>
            </div>
        </OnboardingLayout>
    );
};

export default Success;
