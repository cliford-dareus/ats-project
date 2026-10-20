import { revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";

export const CACHE_TAGS = {
    candidates: "candidates",
    jobs: "jobs",
    stages: "stages",
    applications: "applications",
    organizations: "organizations",
    departments: "departments",
    chartData: "chartData",
} as const;

type Tag = keyof typeof CACHE_TAGS

export const getGlobalTag = (tag: Tag) => `global:${CACHE_TAGS[tag]}` as const
export const getUserTag = (userId: string, tag: Tag) => `user:${userId}-${CACHE_TAGS[tag]}` as const
export const getIdTag = (id: string, tag: Tag) => `id:${id}-${CACHE_TAGS[tag]}` as const
export const getOrgTag = (orgId: string, tag: Tag) => `org:${orgId}-${CACHE_TAGS[tag]}` as const

export type ValidTags =
    | ReturnType<typeof getGlobalTag>
    | ReturnType<typeof getUserTag>
    | ReturnType<typeof getIdTag>
    | ReturnType<typeof getOrgTag>


export function clearFullCache() {
    revalidateTag("*")
};

export function dbCache<T extends (...args: any[]) => Promise<any>>(
    cb: T,
    {
        tags,
        keyParts = [],
        revalidate = 3600, // 1 hour default
    }: {
        tags: ValidTags[]
        keyParts?: string[]
        revalidate?: number | false
    }
) {
    return cache(
        unstable_cache(cb, keyParts, {
            tags,
            revalidate,
        })
    )
}

export function revalidateDbCache({
    tag,
    userId,
    id,
    orgId,
}: {
    tag: Tag
    userId?: string
    id?: string
    orgId?: string
}) {
    const tags: string[] = [getGlobalTag(tag)]
    if (userId) tags.push(getUserTag(userId, tag))
    if (id) tags.push(getIdTag(id, tag))
    if (orgId) tags.push(getOrgTag(orgId, tag))

    for (const t of tags) {
        try {
            revalidateTag(t)
        } catch {
            // Outside a Next.js request (BullMQ worker / scripts) there is no
            // incremental cache to invalidate; entries expire via `revalidate`.
        }
    }
}
