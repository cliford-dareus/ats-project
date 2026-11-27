/**
 * Shared org-branding helpers for public career surfaces and settings.
 *
 * `primary_color` is stored as either a preset name ("purple") or a hex
 * string ("#7c3aed") — the General Settings form offers both. These
 * resolvers turn the stored value into something safe to render as CSS.
 */

export const BRAND_COLOR_PRESETS = [
    { value: "purple", label: "Purple", swatch: "#7c3aed" },
    { value: "blue", label: "Blue", swatch: "#2563eb" },
    { value: "indigo", label: "Indigo", swatch: "#4f46e5" },
    { value: "emerald", label: "Emerald", swatch: "#059669" },
    { value: "rose", label: "Rose", swatch: "#e11d48" },
    { value: "orange", label: "Orange", swatch: "#ea580c" },
    { value: "zinc", label: "Zinc", swatch: "#3f3f46" },
] as const;

export const DEFAULT_PRIMARY_COLOR = "#7c3aed";

/** Resolve a stored primary_color (preset name or hex) to a CSS color. */
export function resolvePrimaryColor(value: string | null | undefined): string {
    if (!value) return DEFAULT_PRIMARY_COLOR;
    const v = value.trim();
    if (v.startsWith("#")) return v;
    const preset = BRAND_COLOR_PRESETS.find((c) => c.value === v.toLowerCase());
    return preset?.swatch ?? DEFAULT_PRIMARY_COLOR;
}

const FONT_STACKS: Record<string, string> = {
    sans: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    serif: "ui-serif, Georgia, serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

/** Resolve a stored font_family ("sans" | "serif" | "mono") to a CSS font stack. */
export function resolveFontFamily(value: string | null | undefined): string {
    if (!value) return FONT_STACKS.sans;
    return FONT_STACKS[value.trim().toLowerCase()] ?? FONT_STACKS.sans;
}

/**
 * Org display name. Falls back to the subdomain — never a fake company name.
 */
export function resolveCompanyName(
    name: string | null | undefined,
    subdomain: string
): string {
    const n = name?.trim();
    return n ? n : subdomain;
}

/** Tagline, trimmed — null when the org has none (render nothing, don't invent one). */
export function resolveTagline(value: string | null | undefined): string | null {
    const t = value?.trim();
    return t ? t : null;
}

/**
 * Public logo URL for an org, or null when it has no logo. The logo is
 * served through the public logo route (the R2 key itself is never
 * exposed to the browser); callers fall back to initials/subdomain.
 */
export function resolveLogoUrl(
    subdomain: string,
    logoKey: string | null | undefined
): string | null {
    if (!logoKey?.trim()) return null;
    return `/api/orgs/${subdomain}/logo`;
}
