// app/(public)/[domain]/layout.tsx
// import {getTenantData} from '@/lib/tenant';
import type {ReactNode} from 'react';

export default async function PublicLayout({
                                               params,
                                               children,
                                           }: {
    params: { domain: string };
    children: ReactNode;
}) {
    // const tenant = await getTenantData(params.domain);

    return (
        <>
            {/* Inject CSS variables globally for this tenant */}
      {/*      <style>{`:root {*/}
      {/*    --primary-color: ${tenant.primary_color};*/}
      {/*    --font-main: ${tenant.font_family};*/}
      {/*  }*/}
      {/*`}</style>*/}

            {children}
        </>
    );
}