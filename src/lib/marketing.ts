export const PRODUCT_NAME = "Applico";

export const ROOT_DOMAIN =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online";

/** Dashboard app origin (app subdomain). */
export function get_app_url() {
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }
    // Local dev often uses localhost for both; production uses app.{domain}
    if (process.env.NODE_ENV === "development") {
        return "http://app.aplico.localhost:3000";
    }
    return `https://app.${ROOT_DOMAIN}`;
}

/** Public marketing origin (apex). Hosts candidate-facing pages like /interview/hold/[token]. */
export function get_marketing_url() {
    if (process.env.NEXT_PUBLIC_MARKETING_URL) {
        return process.env.NEXT_PUBLIC_MARKETING_URL.replace(/\/$/, "");
    }
    if (process.env.NODE_ENV === "development") {
        return `http://${process.env.NEXT_PUBLIC_LOCAL_DOMAIN ?? "aplico.localhost"}:3000`;
    }
    return `https://${ROOT_DOMAIN}`;
}

export const MARKETING_NAV = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
] as const;
