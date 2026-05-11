import { ArrowRight, Building, Building2, Plus } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import OnboardingLayout from "./onboarding-layout";

const Organization = ({ userId }: { userId: string }) => {
    const router = useRouter();
    const suggestedOrgs = [
        { id: 'org-1', name: 'Design Studio', domain: 'designstudio.com' },
        { id: 'org-2', name: 'TechFlow', domain: 'techflow.io' }
    ];

    if (!userId) {
        redirect("/signin");
    };

    return (
        <OnboardingLayout
            title="Organization"
            subtitle="Create or join an organization to collaborate with others."
            icon={Building2}
        >
            <div className="space-y-6">
                <div className="space-y-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Suggested for you</p>
                    <div className="grid gap-3">
                        {suggestedOrgs.map(org => (
                            <button
                                key={org.id}
                                // onClick={() => onSelectOrg(org.id, org.name)}
                                className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-brand-500 hover:bg-brand-50/30 transition-all group"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
                                        <Building className="w-5 h-5 text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-zinc-900 group-hover:text-brand-700">{org.name}</p>
                                        <p className="text-xs text-zinc-500">{org.domain}</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-zinc-300 group-hover:text-brand-500 transform group-hover:translate-x-1 transition-all" />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-100"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-zinc-400 font-bold">Or</span>
                    </div>
                </div>

                <button
                    onClick={() => router.push("/onboarding?step=create")}
                    className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-600 font-bold hover:border-brand-500 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Create New Organization
                </button>
            </div>
        </OnboardingLayout>
    );
};

// onClick = {() => router.push("/onboarding?step=join")}
export default Organization;
