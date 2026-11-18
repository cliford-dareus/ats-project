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
    | "member:view";

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    "org:admin": [
        "job:create", "job:edit", "job:delete", "job:view",
        "candidate:create", "candidate:edit", "candidate:evaluate", "candidate:view", "candidate:delete",
        "application:create", "application:edit", "application:view", "application:move",
        "interview:schedule", "interview:view", "interview:cancel",
        "communication:view", "communication:send", "communication:manage",
        "report:view", "report:generate",
        "settings:manage", "plugin:manage",
        "member:invite", "member:manage", "member:view",
    ],
    "org:recruiter": [
        "job:create", "job:edit", "job:view",
        "candidate:create", "candidate:edit", "candidate:evaluate", "candidate:view",
        "application:create", "application:edit", "application:view", "application:move",
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
