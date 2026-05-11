import { db } from "@/drizzle/db";
import { organization } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const subdomain = req.nextUrl.searchParams.get("subdomain");

    if (!subdomain || subdomain.length < 3) {
        return NextResponse.json(
            { error: "Subdomain must be at least 3 characters" },
            { status: 400 }
        );
    }

    // Basic validation
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
        return NextResponse.json(
            { error: "Subdomain can only contain lowercase letters, numbers, and hyphens" },
            { status: 400 }
        );
    }

    try {
        // Check if subdomain already exists in your database
        const existingOrg = await db.select()
            .from(organization)
            .where(eq(organization.subdomain, subdomain.toLowerCase()))
            .limit(1);

        const available = existingOrg.length === 0;

        return NextResponse.json({ available });
    } catch (error) {
        console.error("Subdomain check error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
};
