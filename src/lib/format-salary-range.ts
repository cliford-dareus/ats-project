// Formats a salary range from the stored min/max values, which are plain
// numeric strings (or "" / null when unset). Returns "" when neither is
// set, so callers can fall back to their own placeholder.
export function formatSalaryRange(
    from: string | number | null | undefined,
    upTo: string | number | null | undefined,
): string {
    const parse = (value: string | number | null | undefined): number | null => {
        if (value === null || value === undefined || value === "") return null;
        const n = typeof value === "number" ? value : Number(value);
        return Number.isNaN(n) ? null : n;
    };

    const min = parse(from);
    const max = parse(upTo);
    const format = (n: number) => `$${n.toLocaleString()}`;

    if (min !== null && max !== null) return `${format(min)} - ${format(max)}`;
    if (min !== null) return `From ${format(min)}`;
    if (max !== null) return `Up to ${format(max)}`;
    return "";
}
