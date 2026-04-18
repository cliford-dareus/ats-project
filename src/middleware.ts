import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {NextResponse} from "next/server";

// Define which routes are "Public" (Candidate facing)
// and which are "Internal" (Your landing page/marketing)
const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks(.*)"
]);

// export default clerkMiddleware(async (auth, req) => {
//     const url = req.nextUrl;
//     let hostname = req.headers.get("host") || "";
//
//     // Remove the port if it exists
//     hostname = hostname.replace(/\:\d+$/, "");
//
//     // Define your main domains (where the landing page and app live)
//     // In production, this would be 'yourapp.com' and 'app.yourapp.com'
//     const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";
//     const searchParams = url.searchParams.toString();
//     const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;
//
//     // 2. Extract the subdomain (e.g., 'acme' from 'acme.localhost:3000')
//     const subdomain = hostname.replace(`.${rootDomain}`, "");
//
//     // --- DEBUG LOGS ---
//     console.log("------- DEBUG -------");
//     console.log("Full Hostname:", hostname);
//     console.log("Root Domain:", rootDomain);
//     console.log("Detected Subdomain:", subdomain);
//     console.log("Path", path)
//     // -------------------
//
//     // CASE 1: The Main App / Marketing Site
//     // If there's no subdomain, or the subdomain is 'www' or 'app'
//     if (subdomain === hostname || subdomain === "www"){
//         console.log("Detected Main Domain", subdomain, hostname);
//         // Otherwise, just serve the normal landing page (public)
//         return NextResponse.rewrite(new URL(`/${hostname}`, req.url));
//     };
//
//     // If it's the 'app' subdomain, it's likely your recruiter dashboard
//     if (subdomain === "app") {
//         // Protect the dashboard: Redirect to login if not authenticated
//         if ((await auth()).userId && !isPublicRoute(req)) {
//             await auth.protect()
//         }
//
//         // If they are at app.localhost/, take them to app.localhost/dashboard
//         // This prevents them from seeing the marketing landing page
//         if (url.pathname === "/") {
//             return NextResponse.rewrite(new URL(`/dashboard${path}`, req.url));
//         }
//
//         // Otherwise, just let them through to whatever admin path they typed
//         return NextResponse.rewrite(new URL(`${path}`, req.url));
//     };
//
//     // The Candidate Facing Career Portal
//     // This triggers for any other subdomain (e.g., acme.atshub.com)
//     return NextResponse.rewrite(new URL(`/${subdomain}${path}`, req.url));
// });

export default clerkMiddleware(async (auth, req) => {
    const url = req.nextUrl;
    let hostname = req.headers.get('host') || '';
    hostname = hostname.replace(/:\d+$/, ''); // remove port

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost';

    // Better subdomain extraction
    let subdomain = '';
    if (hostname.endsWith(`.${rootDomain}`)) {
        subdomain = hostname.replace(`.${rootDomain}`, '');
    } else if (hostname === rootDomain) {
        subdomain = ''; // main domain
    } else {
        // Handle custom domains or exact match (rare)
        subdomain = hostname;
    }

    const searchParams = url.searchParams.toString();
    const path = `${url.pathname}${searchParams ? `?${searchParams}` : ''}`;

    console.log('DEBUG:', { hostname, rootDomain, subdomain, path });

    // === MAIN DOMAIN / MARKETING SITE ===
    if (!subdomain || subdomain === 'www') {
        // Serve normal landing page at root (most common)
        return NextResponse.rewrite(new URL('/', req.url)); // or NextResponse.next() if no rewrite needed
    }

    // === APP / RECRUITER DASHBOARD ===
    if (subdomain === 'app') {
        // const { userId } = await auth();
        // Protect the dashboard: Redirect to login if not authenticated
        if ((await auth()).userId && !isPublicRoute(req)) {
            await auth.protect()
        }

        // Redirect root of app subdomain to dashboard
        if (url.pathname === '/') {
            return NextResponse.rewrite(new URL('/dashboard', req.url));
        }

        // Let other app paths through normally
        return NextResponse.next();
    }

    // === CANDIDATE / TENANT CAREER PORTALS ===
    // Any other subdomain (e.g. acme.yourapp.com) → /acme/...
    // Make sure you have app/[tenant]/... routes
    return NextResponse.rewrite(new URL(`/${subdomain}${path}`, req.url));
});

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
        // "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
}
