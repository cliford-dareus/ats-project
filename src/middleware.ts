// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// ── Constants ─────────────────────────────────────────────────────────────────
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "apliko.com";
const LOCAL_ROOT = process.env.NEXT_PUBLIC_LOCAL_DOMAIN ?? "apliko.localhost";
const APP_SUB = "app";

// Subdomains that should never be treated as a career-page org lookup.
// Anything in here (other than "app", which has its own branch) falls
// back to the marketing site.
const RESERVED_SUBDOMAINS = new Set(["www", "api", "mail", "admin", "static", "assets"]);

// Routes that require Clerk auth inside the dashboard
const isProtected = createRouteMatcher([
    "/dashboard(.*)",
    "/jobs(.*)",
    "/candidates(.*)",
    "/reports(.*)",
    "/applications(.*)",
    "/settings(.*)",
    "/api/ats/trigger", // authenticated trigger route only (exact match, no wildcard)
]);

// ── Host parser ───────────────────────────────────────────────────────────────
type HostType =
    | { kind: "marketing" }                     // localhost:3000 | apliko.com | www.apliko.com
    | { kind: "dashboard" }                     // app.localhost:3000 | app.apliko.com
    | { kind: "career"; subdomain: string };    // bridge.localhost:3000 | bridge.apliko.com

function parseHost(req: NextRequest): HostType {
    const host = req.headers.get("host") ?? "";
    const hostname = host.split(":")[0].toLowerCase(); // strip port, normalize case

    // ── bare localhost → marketing ────────────────────────────────────────────
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return { kind: "marketing" };
    }

    // ── resolve root: prod or local ───────────────────────────────────────────
    const isProd = hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`);
    const isLocal = hostname === LOCAL_ROOT || hostname.endsWith(`.${LOCAL_ROOT}`);

    if (!isProd && !isLocal) {
        // Unknown host — fall through to marketing (safe default)
        return { kind: "marketing" };
    }

    const root = isProd ? ROOT_DOMAIN : LOCAL_ROOT;

    // bare root (apliko.com | apliko.localhost) → marketing
    if (hostname === root) return { kind: "marketing" };

    // extract subdomain label: "app" | "bridge" | "hisgra" …
    const sub = hostname.slice(0, hostname.length - root.length - 1); // strip ".root"

    if (sub === APP_SUB) return { kind: "dashboard" };
    if (RESERVED_SUBDOMAINS.has(sub)) return { kind: "marketing" };

    return { kind: "career", subdomain: sub };
}

// ── Middleware ────────────────────────────────────────────────────────────────
export default clerkMiddleware(async (auth, req) => {
    const host = parseHost(req);

    switch (host.kind) {

        // ── Marketing site ──────────────────────────────────────────────────────
        // localhost:3000, apliko.com, or www.apliko.com — serve /(marketing) group
        case "marketing": {
            const url = req.nextUrl.clone();
            // url.pathname = `/marketing${url.pathname === "/" ? "" : url.pathname}`;
            return NextResponse.rewrite(url);
        }

        // ── Dashboard ───────────────────────────────────────────────────────────
        // app.apliko.localhost or app.apliko.com — Clerk protected
        case "dashboard": {
            if (isProtected(req)) await auth.protect();
            // No rewrite needed — (dashboard) folder matches naturally
            return NextResponse.next();
        }

        // ── Career page ─────────────────────────────────────────────────────────
        // {org}.apliko.localhost or {org}.apliko.com
        case "career": {
            const url = req.nextUrl.clone();
            const { subdomain } = host;

            // Rewrite: /jobs/1/apply → /(public)/[subdomain]/jobs/1/apply
            url.pathname = `/${subdomain}${url.pathname === "/" ? "" : url.pathname}`;

            const res = NextResponse.rewrite(url);
            res.headers.set("x-subdomain", subdomain);
            res.headers.set("x-root-domain", ROOT_DOMAIN);
            return res;
        }
    }
});

export const config = {
    matcher: [
        // Match everything except Next.js internals and static files
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
    ],
};
