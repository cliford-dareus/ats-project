import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadOrgLogoToR2 } from "@/lib/upload-file-to-r2";
import { set_org_logo_action } from "@/server/actions/organization_actions";

const ALLOWED_LOGO_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/**
 * Org logo upload. Authenticated + settings:manage-gated (via
 * set_org_logo_action), org-scoped R2 key, image-only, 2 MB max.
 * The previous logo object is left in R2 (same accepted gap as the
 * org-deletion webhook — orphaned blobs are not deleted anywhere yet).
 */
export async function POST(req: Request) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("logo") as File | null;
        if (!file || file.size <= 0) {
            return NextResponse.json({ error: "A logo file is required" }, { status: 400 });
        }
        if (!ALLOWED_LOGO_MIME.has(file.type)) {
            return NextResponse.json(
                { error: "Logo must be a PNG, JPG, or WebP image" },
                { status: 400 }
            );
        }
        if (file.size > MAX_LOGO_BYTES) {
            return NextResponse.json(
                { error: "Logo must be 2 MB or smaller" },
                { status: 400 }
            );
        }

        const key = await uploadOrgLogoToR2(file, orgId);
        await set_org_logo_action(key);

        return NextResponse.json({ ok: true, key });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Logo upload failed";
        const status = message.includes("permission") ? 403 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
