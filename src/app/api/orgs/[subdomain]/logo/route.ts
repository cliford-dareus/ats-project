import { NextResponse } from "next/server";
import { get_organization_by_subdomain } from "@/server/queries/drizzle/organization";
import { stream_r2_object } from "@/lib/r2-download";

/**
 * Public org logo. No session — the career page is public and the logo is
 * branding meant to be seen. The key comes from the org row resolved by
 * this page's own subdomain (never from the request), and is only served
 * when it matches our branding-key shape, so it can never be used to
 * read arbitrary R2 objects.
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ subdomain: string }> }
) {
    const { subdomain } = await params;
    const [org] = await get_organization_by_subdomain(subdomain);
    const key = org?.logo_url ?? null;

    if (!key || !/^orgs\/[A-Za-z0-9_-]+\/branding\/logo-\d+\.(png|jpg|jpeg|webp)$/.test(key)) {
        return NextResponse.json({ error: "No logo" }, { status: 404 });
    }

    const fileName = key.split("/").pop() ?? "logo";
    return stream_r2_object(key, fileName, true);
}
