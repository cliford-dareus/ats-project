// Shared resume upload limits — the dashboard upload route and the public
// apply flow enforce the same rules. Keep them in one place so the two
// paths can't drift apart again.
export const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_RESUME_MIME = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
]);

// Returns a user-facing error message when the file is not an acceptable
// resume, or null when it is fine.
export function validateResumeFile(file: File): string | null {
    if (file.size <= 0 || file.size > MAX_RESUME_BYTES) {
        return "Resume must be between 1 byte and 10 MB";
    }
    if (!file.type || !ALLOWED_RESUME_MIME.has(file.type)) {
        return "Resume must be a PDF, DOC, DOCX, PNG or JPG file";
    }
    return null;
}
