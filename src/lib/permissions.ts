export type Permission =
    | "job:create"
    | "job:edit"
    | "job:delete"
    | "job:view"
    | "candidate:create"
    | "candidate:edit"
    | "candidate:evaluate"
    | "application:move"
    | "interview:schedule"
    | "report:view"
    | "report:generate"
    | "settings:manage"
    | "plugin:manage"
    | "member:invite"
    | "member:manage";

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    "org:admin": [
        "job:create", "job:edit", "job:delete", "job:view",
        "candidate:create", "candidate:edit", "candidate:evaluate",
        "application:move", "interview:schedule",
        "report:view", "report:generate",
        "settings:manage", "plugin:manage",
        "member:invite", "member:manage",
    ],
    "org:recruiter": [
        "job:create", "job:edit", "job:view",
        "candidate:create", "candidate:edit", "candidate:evaluate",
        "application:move", "interview:schedule",
        "report:view", "report:generate",
    ],
    "org:hiring_manager": [
        "job:view",
        "candidate:evaluate",
        "interview:schedule",
        "report:view",
    ],
    "org:member": [
        "job:view",
        "report:view",
    ],
};
