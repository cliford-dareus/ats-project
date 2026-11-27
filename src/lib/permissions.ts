export type Permission =
    | "job:create"
    | "job:edit"
    | "job:delete"
    | "job:view"
    | "candidate:create"
    | "candidate:edit"
    | "candidate:evaluate"
    | "candidate:view"
    | "candidate:delete"
    | "application:create"
    | "application:edit"
    | "application:view"
    | "application:move"
    | "application:delete"
    | "interview:schedule"
    | "interview:view"
    | "interview:cancel"
    | "communication:view"
    | "communication:send"
    | "communication:manage"
    | "report:view"
    | "report:generate"
    | "settings:manage"
    | "plugin:manage"
    | "member:invite"
    | "member:manage"
    | "member:view"
    | "note:create"
    ;

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    "org:admin": [
        "job:create", "job:edit", "job:delete", "job:view",
        "candidate:create", "candidate:edit", "candidate:evaluate", "candidate:view", "candidate:delete",
        "application:create", "application:edit", "application:view", "application:move", "application:delete",
        "interview:schedule", "interview:view", "interview:cancel",
        "communication:view", "communication:send", "communication:manage",
        "report:view", "report:generate",
        "settings:manage", "plugin:manage",
        "member:invite", "member:manage", "member:view",
    ],
    "org:recruiter": [
        "job:create", "job:edit", "job:view",
        "candidate:create", "candidate:edit", "candidate:evaluate", "candidate:view",
        "application:create", "application:edit", "application:view", "application:move", "application:delete",
        "interview:schedule", "interview:view", "interview:cancel",
        "communication:view", "communication:send", "communication:manage",
        "report:view", "report:generate",
        "member:view",
    ],
    "org:hiring_manager": [
        "job:view",
        "candidate:view", "candidate:evaluate",
        "application:view",
        "interview:schedule", "interview:view",
        "communication:view",
        "report:view",
    ],
    "org:member": [
        "job:view",
        "candidate:view",
        "application:view",
        "interview:view",
        "communication:view",
        "report:view",
    ],
};

export const role_has_permission = async (role: string, permission: Permission) => { 
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};