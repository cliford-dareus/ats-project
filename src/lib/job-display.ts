/**
 * Small display helpers shared by the job detail surfaces (options summary,
 * job preview, job tabs). The career URL construction matches the one used
 * on the organization settings page: `https://{subdomain}.{rootDomain}`,
 * with the public apply page for a single job at `/apply/{jobId}`.
 */

import { JOB_TYPE } from "@/zod";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online";

const JOB_TYPE_LABELS: Record<typeof JOB_TYPE._type, string> = {
    FULL_TIME: "Full-Time",
    PART_TIME: "Part-Time",
    REMOTE: "Remote",
    INTERNSHIP: "Internship",
    CONTRACT: "Contract",
};

/** Human label for a stored job type enum value — never a hardcoded guess. */
export function formatJobTypeLabel(type: typeof JOB_TYPE._type | null | undefined): string {
    if (!type) return "—";
    return JOB_TYPE_LABELS[type] ?? type;
}

/** Public candidate-facing URL for one job on the org's career subdomain. */
export function buildCareerApplyUrl(subdomain: string, jobId: number): string {
    return `https://${subdomain}.${ROOT_DOMAIN}/apply/${jobId}`;
}

/** Copy text to the clipboard; falls back to a temporary textarea when the
 * Clipboard API is unavailable (e.g. non-secure contexts). */
export async function copyTextToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Clipboard API unavailable — fall back to execCommand.
        try {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(textarea);
            return ok;
        } catch {
            return false;
        }
    }
}
