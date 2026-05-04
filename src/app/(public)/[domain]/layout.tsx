import { get_organization_by_subdomain_action } from '@/server/actions/organization_actions';
import { Briefcase } from 'lucide-react';
import type { ReactNode } from 'react';

export default async function PublicLayout({
    params,
    children,
}: {
    params: Promise<{ domain: string }>;
    children: ReactNode;
}) {
    const { domain: subdomain } = await params;
    const tenant = await get_organization_by_subdomain_action(subdomain);

    if (!tenant) {
        return <></>;
    }

    return (
        <>
            {/*Inject CSS variables globally for this tenant */}
            <style>{`:root {
            --primary-color: ${tenant[0]?.primary_color};
            --font-main: ${tenant[0]?.font_family};
            }`}</style>
            {/*<header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: tenant[0]?.primary_color, boxShadow: `0 10px 15px -3px ${tenant[0]?.primary_color}33` }}
                        >
                            <Briefcase className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">{tenant[0]?.name}</h1>
                    </div>
                </div>
            </header>*/}

            {/* Navigation */}
            <nav className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center">
                            <span className="text-white font-black text-xl italic tracking-tighter">H</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight hidden sm:block">HireSync</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium text-zinc-500">
                        <a href="#" className="hover:text-black transition-colors">Open Positions</a>
                        <a href="#" className="hover:text-black transition-colors">Our Culture</a>
                        <div className="h-4 w-px bg-zinc-200" />
                        <span className="text-xs text-zinc-400 font-normal">Candidate Portal v1.0</span>
                    </div>
                </div>
            </nav>

            {children}

            {/* Footer */}
            <footer className="py-12 border-t border-zinc-100 bg-white">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <p className="text-sm text-zinc-400">
                        © 2026 HireSync Technologies Inc. All rights reserved.
                        <br />
                        HireSync is an Equal Opportunity Employer.
                    </p>
                </div>
            </footer>
        </>
    );
}
