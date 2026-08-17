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
    revalidateTag(getGlobalTag(tag))
    if (userId) revalidateTag(getUserTag(userId, tag))
    if (id) revalidateTag(getIdTag(id, tag))
    if (orgId) revalidateTag(getOrgTag(orgId, tag))
}
