// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online";
const LOCAL_ROOT = process.env.NEXT_PUBLIC_LOCAL_DOMAIN ?? "aplico.localhost";
const APP_SUB = "app";

const RESERVED_SUBDOMAINS = new Set([
    "www",
    "api",
    "mail",
    "admin",
    "static",
    "assets",
]);

const isProtected = createRouteMatcher([
    "/dashboard(.*)",
    "/jobs(.*)",
    "/candidates(.*)",
    "/reports(.*)",
    "/applications(.*)",
    "/communication(.*)",
    "/settings(.*)",
    "/onboarding(.*)",
    "/api/ats/trigger",
]);

type HostType =
    | { kind: "marketing" }
    | { kind: "dashboard" }
    | { kind: "career"; subdomain: string };

function parseHost(req: NextRequest): HostType {
    const host = req.headers.get("host") ?? "";
    const hostname = host.split(":")[0].toLowerCase();

    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return { kind: "marketing" };
    }

    const isProd =
        hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`);
    const isLocal =
        hostname === LOCAL_ROOT || hostname.endsWith(`.${LOCAL_ROOT}`);

    if (!isProd && !isLocal) {
        return { kind: "marketing" };
    }

    const root = isProd ? ROOT_DOMAIN : LOCAL_ROOT;

    if (hostname === root || hostname === `www.${root}`) {
        return { kind: "marketing" };
    }

    const sub = hostname.slice(0, hostname.length - root.length - 1);

    if (sub === APP_SUB) return { kind: "dashboard" };
    if (RESERVED_SUBDOMAINS.has(sub)) return { kind: "marketing" };

    // Basic slug sanitization
    const slug = sub.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug || slug.length > 63) return { kind: "marketing" };

    return { kind: "career", subdomain: slug };
}

function withSecurityHeaders(res: NextResponse) {
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return res;
}

export default clerkMiddleware(async (auth, req) => {
    const host = parseHost(req);

    switch (host.kind) {
        case "marketing": {
            return withSecurityHeaders(NextResponse.next());
        }

        case "dashboard": {
            if (isProtected(req)) {
                await auth.protect();
            }
            return withSecurityHeaders(NextResponse.next());
        }

        case "career": {
            const url = req.nextUrl.clone();
            url.pathname = `/${host.subdomain}${url.pathname === "/" ? "" : url.pathname
                }`;

            const res = NextResponse.rewrite(url);
            res.headers.set("x-subdomain", host.subdomain);
            res.headers.set("x-root-domain", ROOT_DOMAIN);
            return withSecurityHeaders(res);
        }
    }
});

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
    ],
};
