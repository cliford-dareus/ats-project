import { headers } from "next/headers";

type Bucket = { count: number; reset_at: number };

// In-memory fixed-window buckets. Per server instance only — good enough for
// the low-traffic public hold routes; move to Redis if the app ever runs
// multiple instances behind a load balancer.
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

/** Fixed-window rate limit. Returns true when the attempt is allowed. */
export function check_rate_limit(
    key: string,
    limit: number,
    window_ms: number
): boolean {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.reset_at <= now) {
        if (buckets.size >= MAX_BUCKETS) {
            // Prune expired buckets before adding a new one.
            for (const [k, b] of buckets) {
                if (b.reset_at <= now) buckets.delete(k);
            }
        }
        buckets.set(key, { count: 1, reset_at: now + window_ms });
        return true;
    }

    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
}

/** Best-effort client IP for rate limiting; "unknown" outside a request. */
export async function get_client_ip(): Promise<string> {
    try {
        const h = await headers();
        const forwarded = h.get("x-forwarded-for");
        if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
        return h.get("x-real-ip") || "unknown";
    } catch {
        return "unknown";
    }
}
