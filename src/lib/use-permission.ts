"use client";

import { useOrganization } from "@clerk/nextjs";
import { Permission, ROLE_PERMISSIONS } from "@/lib/permissions";

/**
 * Client-side permission check for hiding/disabling UI affordances.
 * Reads the current user's org role from Clerk and checks it against the
 * same ROLE_PERMISSIONS map the server uses.
 *
 * UX-only: server actions enforce the same permissions and are the real
 * gate. While the membership is still loading the role is unknown, so
 * everything is treated as not allowed (buttons render once loaded).
 */
export function useHasPermission() {
    const { membership } = useOrganization();
    const role = membership?.role;

    return (permission: Permission): boolean => {
        if (!role) return false;
        return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
    };
}
