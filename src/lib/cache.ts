import { revalidateTag, unstable_cache } from "next/cache"
import { cache } from "react"

export type ValidTags =
    | ReturnType<typeof getGlobalTag>
    | ReturnType<typeof getUserTag>
    | ReturnType<typeof getIdTag>

export const CACHE_TAGS = {
    candidates: "candidates",
    jobs: "jobs",
    stages: "stages"
} as const

export function getGlobalTag(tag: keyof typeof CACHE_TAGS) {
    return `global:${CACHE_TAGS[tag]}` as const
}

export function getUserTag(userId: string, tag: keyof typeof CACHE_TAGS) {
    return `user:${userId}-${CACHE_TAGS[tag]}` as const
}

export function getIdTag(id: string, tag: keyof typeof CACHE_TAGS) {
    return `id:${id}-${CACHE_TAGS[tag]}` as const
}

export function clearFullCache() {
    revalidateTag("*")
}

export function dbCache<T extends  (...args: any[]) => Promise<any>>(
    cb: Parameters<typeof unstable_cache<T>>[0],
    {tags}: {tags: ValidTags[]}
) {
    return cache(unstable_cache<T>(cb, undefined, {tags: [...tags, "*"]}))
}

