"use server";

import { getAuthOrThrow } from "@/server/permissions";
import { get_notifications_db, mark_notifications_read_db } from "@/server/queries/mongo/notifications";

/** Notifications for the signed-in user within the active org only. */
export const get_my_notifications_action = async () => {
    const { userId, orgId } = await getAuthOrThrow();
    return get_notifications_db(orgId, userId);
};

export const mark_notifications_read_action = async (ids?: string[]) => {
    const { userId, orgId } = await getAuthOrThrow();
    const safeIds = (ids ?? []).filter((id) => /^[a-f0-9]{24}$/.test(id));
    await mark_notifications_read_db(orgId, userId, safeIds);
    return { success: true };
};
