import { NextRequest, NextResponse } from "next/server";
import { check_organization_subdomain } from "@/server/queries/drizzle/organization";
import { subdomainSchema } from "@/zod";
import { client_ip, rate_limit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
    const limited = await rate_limit(`subdomain-check:${await client_ip()}`, 60, 60);
    if (!limited.ok) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const parsed = subdomainSchema.safeParse(req.nextUrl.searchParams.get("subdomain") ?? "");
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid subdomain", available: false },
            { status: 400 }
        );
    }

    try {
        const existing = await check_organization_subdomain(parsed.data);
        return NextResponse.json({ available: existing.length === 0 });
    } catch (error) {
        console.error("Subdomain check error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
};
