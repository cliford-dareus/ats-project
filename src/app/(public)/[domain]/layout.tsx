import { get_organization_by_subdomain_action } from '@/server/actions/organization_actions';
import {
    resolveCompanyName,
    resolveFontFamily,
    resolvePrimaryColor,
} from '@/lib/org-branding';
import type { ReactNode } from 'react';

export default async function PublicLayout({
    params,
    children,
}: {
    params: Promise<{ domain: string }>;
    children: ReactNode;
}) {
    const { domain: subdomain } = await params;
    const [tenant] = await get_organization_by_subdomain_action(subdomain);
    if (!tenant) {
        return <></>;
    };

    // Header, nav, and footer all render the org resolved from this page's
    // own subdomain — never a hardcoded product name.
    const companyName = resolveCompanyName(tenant.name, subdomain);
    const primaryColor = resolvePrimaryColor(tenant.primary_color);
    const initial = companyName.charAt(0).toUpperCase();
    const year = new Date().getFullYear();

    return (
        <>
            {/*Inject CSS variables globally for this tenant */}
            <style>{`:root {
            --primary-color: ${primaryColor};
            --font-main: ${resolveFontFamily(tenant.font_family)};
            }`}</style>

            {/* Navigation */}
            <nav className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <span className="text-white font-black text-xl italic tracking-tighter">{initial}</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight hidden sm:block">{companyName}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium text-zinc-500">
                        <a href="#open-positions" className="hover:text-black transition-colors">Open Positions</a>
                    </div>
                </div>
            </nav>

            {children}

            {/* Footer */}
            <footer className="py-12 border-t border-zinc-100 bg-white">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <p className="text-sm text-zinc-400">
                        © {year} {companyName}. All rights reserved.
                        <br />
                        {companyName} is an Equal Opportunity Employer.
                    </p>
                </div>
            </footer>
        </>
    );
};
