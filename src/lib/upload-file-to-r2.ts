import { r2Client } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

// MIME → extension for the stored key. The key previously always ended in
// .pdf regardless of the actual file type.
const MIME_EXTENSIONS: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "image/png": ".png",
    "image/jpeg": ".jpg",
};

const FILENAME_EXTENSIONS = new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg"]);

// Slugify for use in an object key: lowercase alphanumerics + hyphens only,
// so a crafted candidate name can't inject path separators or ".." segments.
function slugify(value: string): string {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
    return slug || "candidate";
}

function keyExtension(file: File): string {
    const fromMime = MIME_EXTENSIONS[file.type];
    if (fromMime) return fromMime;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext && FILENAME_EXTENSIONS.has(ext)) return `.${ext}`;
    return ".pdf";
}

export async function uploadResumeToR2(
    file: File,
    candidateName: string,
    scope?: { orgId: string; candidateId: number }
): Promise<string> {
    const slug = slugify(candidateName);
    const ext = keyExtension(file);
    // Scope the key to the org + candidate when known so objects aren't
    // enumerable across tenants by timestamp + name. The org id is kept
    // verbatim (minus unsafe chars) so keys stay attributable to the org.
    // Legacy callers (public application flow) omit scope and keep the
    // previous flat layout.
    const orgSegment = scope ? scope.orgId.replace(/[^A-Za-z0-9_-]/g, "") : "";
    const key = scope && orgSegment
        ? `orgs/${orgSegment}/candidates/${scope.candidateId}/resumes/${Date.now()}-${slug}${ext}`
        : `resumes/${Date.now()}-${slug}${ext}`;

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type || 'application/pdf',
    });

    await r2Client.send(command);
    return key; // we store the key (private + signed URLs later)
};

const LOGO_MIME_EXTENSIONS: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
};

/**
 * Org logo upload. Same PutObject pattern as resumes, but the key is
 * org-scoped under branding/ and the file must be an image — the caller
 * (logo upload route) validates mime + size before calling. Returns the
 * R2 key, which is stored on the organization row and served publicly
 * through /api/orgs/[subdomain]/logo.
 */
export async function uploadOrgLogoToR2(file: File, orgId: string): Promise<string> {
    const ext = LOGO_MIME_EXTENSIONS[file.type];
    if (!ext) {
        throw new Error("Logo must be a PNG, JPG, or WebP image");
    }
    const orgSegment = orgId.replace(/[^A-Za-z0-9_-]/g, "");
    const key = `orgs/${orgSegment}/branding/logo-${Date.now()}${ext}`;

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
    });

    await r2Client.send(command);
    return key;
}
