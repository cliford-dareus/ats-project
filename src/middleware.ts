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
  // Authenticated APIs used by the dashboard
  "/api/candidates(.*)",
  "/api/reports(.*)",
  "/api/upload(.*)",
  "/api/organization/invite(.*)",
  "/api/organization/join(.*)",
  "/api/revalidate-db-cache(.*)",
]);

/** Must stay reachable from any host */
const isPublicApi = createRouteMatcher([
  "/api/webhooks(.*)",
  "/api/trigger/public(.*)",
  "/api/organization/check(.*)",
]);

/** Marketing / auth / public candidate pages on apex */
const isMarketingPath = createRouteMatcher([
  "/",
  "/features(.*)",
  "/pricing(.*)",
  "/about(.*)",
  "/contact(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/interview/hold(.*)",
]);

type HostType =
  | { kind: "marketing"; root: string }
  | { kind: "dashboard"; root: string }
  | { kind: "career"; subdomain: string; root: string }
  | { kind: "bare_local" }; // localhost / 127.0.0.1 without multi-tenant DNS

function parseHost(req: NextRequest): HostType {
  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();

  // Bare localhost: no subdomain DNS — handled specially in middleware
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { kind: "bare_local" };
  }

  const isProd =
    hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`);
  const isLocal =
    hostname === LOCAL_ROOT || hostname.endsWith(`.${LOCAL_ROOT}`);

  if (!isProd && !isLocal) {
    // Unknown host — treat as marketing apex (safest default)
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

/** Build https://app.{root}/path (preserve port for local *.localhost) */
function redirectToAppSubdomain(req: NextRequest, root: string) {
  const url = req.nextUrl.clone();
  const incomingHost = req.headers.get("host") ?? "";
  const port = incomingHost.includes(":")
    ? incomingHost.split(":")[1]
    : req.nextUrl.port;

  const appHost = port ? `${APP_SUB}.${root}:${port}` : `${APP_SUB}.${root}`;
  url.host = appHost;
  // Prefer https in production; keep current protocol for local
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
      // Never serve the product app on apex/www — send users to app.*
      if (isAppRoute(req)) {
        return redirectToAppSubdomain(req, host.root);
      }
      return withSecurityHeaders(NextResponse.next());
    }

    case "dashboard": {
      if (isAppRoute(req)) {
        await auth.protect();
      }
      // Optional: keep marketing pages off the app host (redirect to apex)
      // Uncomment if you want strict isolation both ways:
      // if (isMarketingPath(req) && req.nextUrl.pathname !== "/") { ... }
      return withSecurityHeaders(NextResponse.next());
    }

    case "career": {
      // Career sites must not expose the recruiter dashboard
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
      //
      // Local dev without subdomain DNS:
      // - Marketing paths → OK on localhost
      // - App paths → still require sign-in (do not leave open)
      // Prefer app.aplico.localhost:3000 when testing multi-tenant isolation.
      //
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
