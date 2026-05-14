import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
    const url = req.nextUrl;
    let hostname = req.headers.get('host') || '';
    hostname = hostname.replace(/:\d+$/, '');

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost';

    let subdomain = '';
    if (hostname.endsWith(`.${rootDomain}`)) {
        subdomain = hostname.replace(`.${rootDomain}`, '');
    } else if (hostname === rootDomain) {
        subdomain = '';
    } else {
        subdomain = hostname;
    }

    const searchParams = url.searchParams.toString();
    const path = `${url.pathname}${searchParams ? `?${searchParams}` : ''}`;

    // === MAIN DOMAIN ===
    if (!subdomain || subdomain === 'www') {
        return NextResponse.next(); // ✅ no rewrite loop
    }

    // === APP / RECRUITER DASHBOARD ===
    if (subdomain === 'app') {
        if (!isPublicRoute(req)) {
            await auth.protect(); // ✅ redirects if not authed
        }
        if (url.pathname === '/') {
            return NextResponse.rewrite(new URL('/dashboard', req.url));
        }
        return NextResponse.next();
    }

    // === CANDIDATE / TENANT PORTALS ===
    return NextResponse.rewrite(new URL(`/${subdomain}${path}`, req.url));
});

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
};