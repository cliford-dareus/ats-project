"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Building2, Loader2, Plus, X } from "lucide-react";
import { set_org_logo_action } from "@/server/actions/organization_actions";
import { resolveLogoUrl } from "@/lib/org-branding";

const ACCEPT = "image/png,image/jpeg,image/webp";

type Props = {
    /** Career-page subdomain — the public logo route is keyed off it. */
    subdomain: string;
    /** Stored R2 key (org.logo_url), or null when the org has no logo. */
    logoKey: string | null | undefined;
    companyName: string;
    disabled?: boolean;
    /**
     * Called with the new R2 key after a successful upload. The upload
     * route already persists the key via set_org_logo_action — callers
     * only need to sync their local/form state so a later save does not
     * clobber it with the stale value.
     */
    onUploaded: (key: string) => void;
    /** Called after the stored logo has been cleared server-side. */
    onRemoved: () => void;
};

/**
 * Shared org logo upload. Used by the Organization profile card and the
 * General Settings branding section. Uploads to POST /api/settings/logo
 * (settings:manage-gated, PNG/JPG/WebP, 2 MB max) and shows the server's
 * real error on failure. Remove clears the stored key via
 * set_org_logo_action(null). With no logo, the Building2 fallback is
 * shown — a broken image is never rendered.
 */
const OrgLogoUpload = ({
    subdomain,
    logoKey,
    companyName,
    disabled = false,
    onUploaded,
    onRemoved,
}: Props) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);
    const [removing, startRemoveTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [imgFailed, setImgFailed] = useState(false);

    const logoUrl = resolveLogoUrl(subdomain, logoKey);

    useEffect(() => {
        setImgFailed(false);
    }, [logoKey]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset so picking the same file again still fires onChange.
        e.target.value = "";
        if (!file) return;
        setError(null);
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("logo", file);
            const res = await fetch("/api/settings/logo", {
                method: "POST",
                body: formData,
            });
            const body = (await res.json().catch(() => null)) as {
                ok?: boolean;
                key?: string;
                error?: string;
            } | null;
            if (!res.ok || !body?.ok || !body.key) {
                throw new Error(body?.error ?? "Logo upload failed");
            }
            onUploaded(body.key);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Logo upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setError(null);
        startRemoveTransition(async () => {
            try {
                await set_org_logo_action(null);
                onRemoved();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to remove logo");
            }
        });
    };

    const busy = uploading || removing;

    return (
        <div>
            <div className="w-24 h-24 rounded-2xl bg-muted border border-border flex items-center justify-center relative group">
                {logoUrl && !imgFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={logoUrl}
                        alt={`${companyName} logo`}
                        className="h-full w-full object-contain p-2"
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <Building2 className="w-10 h-10 text-muted-foreground group-hover:text-brand-600 transition-colors" />
                )}
                {uploading && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                )}
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={busy}
                        aria-label={logoUrl ? "Change logo" : "Upload logo"}
                        title={logoUrl ? "Change logo" : "Upload logo"}
                        className="absolute -bottom-2 -right-2 p-1.5 bg-card border border-border rounded-lg shadow-sm hover:bg-muted disabled:opacity-50"
                    >
                        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                )}
                {logoUrl && !disabled && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={busy}
                        aria-label="Remove logo"
                        title="Remove logo"
                        className="absolute top-1 right-1 p-1 bg-card border border-border rounded-lg shadow-sm hover:bg-muted disabled:opacity-50"
                    >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={handleFileChange}
            />
            {error && (
                <p role="alert" className="text-xs text-destructive mt-2 max-w-48">
                    {error}
                </p>
            )}
        </div>
    );
};

export default OrgLogoUpload;
