// src/middleware.ts
//
// Host routing: the marketing site lives on the apex ({root}), the product on
// app.{root}, and each org's public career page on {subdomain}.{root}.
// App routes are only served (and auth-protected) on the app subdomain;
// marketing hosts redirect them to app.{root}. Public APIs (/api/webhooks,
// /api/trigger/public, /api/organization/check) work on every host.
//
// Local development hosts:
//   - Marketing:  http://aplico.localhost:3000
//   - App:        http://app.aplico.localhost:3000
//   - Career page: http://<subdomain>.aplico.localhost:3000
// Setup: add `127.0.0.1 aplico.localhost app.aplico.localhost` to /etc/hosts
// (plus any career subdomains you want to test). The local root defaults to
// `aplico.localhost` via NEXT_PUBLIC_LOCAL_DOMAIN; production uses
// NEXT_PUBLIC_ROOT_DOMAIN (default `aplico.online`). Bare `localhost` /
// 127.0.0.1 bypass host routing entirely (app routes are still auth-protected).
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

/** Product routes — only allowed on the app subdomain */
const isAppRoute = createRouteMatcher([
    "/dashboard(.*)",
    "/jobs(.*)",
    "/candidates(.*)",
    "/reports(.*)",
    "/applications(.*)",
    "/communication(.*)",
    "/settings(.*)",
    "/onboarding(.*)",
    "/trash(.*)",
    "/api/candidates(.*)",
    "/api/reports(.*)",
    "/api/upload(.*)",
    "/api/revalidate-db-cache(.*)",
]);

/** Must stay reachable from any host */
const isPublicApi = createRouteMatcher([
    "/api/webhooks(.*)",
    "/api/trigger/public(.*)",
    "/api/organization/check(.*)",
]);

type HostType =
    | { kind: "marketing"; root: string }
    | { kind: "dashboard"; root: string }
    | { kind: "career"; subdomain: string; root: string }
    | { kind: "bare_local" };

function parseHost(req: NextRequest): HostType {
    const host = req.headers.get("host") ?? "";
    const hostname = host.split(":")[0].toLowerCase();

    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return { kind: "bare_local" };
    }

    const isProd =
        hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`);
    const isLocal =
        hostname === LOCAL_ROOT || hostname.endsWith(`.${LOCAL_ROOT}`);
    if (!isProd && !isLocal) {
        return { kind: "marketing", root: ROOT_DOMAIN };
    }

    const root = isProd ? ROOT_DOMAIN : LOCAL_ROOT;

    if (hostname === root || hostname === `www.${root}`) {
        return { kind: "marketing", root };
    }

    const sub = hostname.slice(0, hostname.length - root.length - 1);

    if (sub === APP_SUB) return { kind: "dashboard", root };
    if (RESERVED_SUBDOMAINS.has(sub)) return { kind: "marketing", root };

    const slug = sub.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug || slug.length > 63) return { kind: "marketing", root };

    return { kind: "career", subdomain: slug, root };
}

function withSecurityHeaders(res: NextResponse) {
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return res;
}

function resolvePort(req: NextRequest): string {
    const incomingHost = req.headers.get("host") ?? "";
    return incomingHost.includes(":")
        ? incomingHost.split(":")[1]
        : req.nextUrl.port;
}

/** Build https://app.{root}/path (preserve port for local *.localhost) */
function redirectToAppSubdomain(req: NextRequest, root: string) {
    const url = req.nextUrl.clone();
    const port = resolvePort(req);

    const appHost = port ? `${APP_SUB}.${root}:${port}` : `${APP_SUB}.${root}`;
    url.host = appHost;
    if (root === ROOT_DOMAIN && process.env.NODE_ENV === "production") {
        url.protocol = "https:";
    }

    return withSecurityHeaders(NextResponse.redirect(url, 308));
}

export default clerkMiddleware(async (auth, req) => {
    const host = parseHost(req);
    // Public APIs work on every host
    if (isPublicApi(req)) {
        return withSecurityHeaders(NextResponse.next());
    }

    switch (host.kind) {
        case "marketing": {
            if (isAppRoute(req)) {
                return redirectToAppSubdomain(req, host.root);
            }
            return withSecurityHeaders(NextResponse.next());
        }

        case "dashboard": {
            if (isAppRoute(req)) {
                await auth.protect();
                return withSecurityHeaders(NextResponse.next());
            }
            // Marketing/auth pages (sign-in, sign-up, pricing, etc.) don't
            // live on app.* — they currently pass through here rather than
            // redirecting to the apex. A commented-out apex redirect was
            // removed (Nov 2026): re-enabling it would change routing
            // behavior (e.g. sign-in on app.* would bounce to the apex),
            // so it needs a deliberate decision + testing, not a cleanup.
            return withSecurityHeaders(NextResponse.next());
        }

        case "career": {
            if (isAppRoute(req)) {
                return redirectToAppSubdomain(req, host.root);
            }

            const url = req.nextUrl.clone();
            url.pathname = `/${host.subdomain}${url.pathname === "/" ? "" : url.pathname}`;

            const res = NextResponse.rewrite(url);
            res.headers.set("x-subdomain", host.subdomain);
            res.headers.set("x-root-domain", host.root);
            return withSecurityHeaders(res);
        }

        case "bare_local": {
            if (isAppRoute(req)) {
                await auth.protect();
                return withSecurityHeaders(NextResponse.next());
            }
            return withSecurityHeaders(NextResponse.next());
        }
    }
});

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
    ],
};
