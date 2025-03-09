import {NextRequest, NextResponse} from "next/server";
import {db} from "@/drizzle/db";
import {eq} from "drizzle-orm";
import {organization} from "@/drizzle/schema";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (!orgId) {
        console.error("orgId is missing from the query parameters.");
        return NextResponse.json({error: "orgId is required"}, {status: 400});
    }
    // You can now use orgId to fetch data or perform other operations
    // For example, you might query a database or perform some logic here
    const [organi] = await db.select().from(organization).where(eq(organization.clerk_id, orgId));
    return NextResponse.json(organi.plugins || {enabled: [], settings: {}});
}

export async function PATCH(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const body = await req.json();

    if (!orgId) {
        console.error("orgId is missing from the query parameters.");
        return NextResponse.json({error: "orgId is required"}, {status: 400});
    }

    await db.update(organization).set({
        plugins: {enabled: body.enabledPlugins, settings: {}},
        // Add any other fields you want to update here
    }).where(eq(organization.clerk_id, orgId))

    return NextResponse.json({message: "Success"})
};