import { hasPermission } from "@/server/permissions";
import { NoPermissionCard } from "./no-permission-card";
import type { Permission } from "@/lib/permissions";

export async function HasPermission({
  permission,
  renderFallback = false,
  fallbackText,
  children,
}: {
  permission: Permission;
  renderFallback?: boolean;
  fallbackText?: string;
  children: React.ReactNode;
}) {
  const allowed = await hasPermission(permission);

  if (allowed) return children;
  if (renderFallback) {
    return <NoPermissionCard>{fallbackText}</NoPermissionCard>;
  }
  return null;
}
