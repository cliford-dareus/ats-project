// Server-only query module (deliberately not "use server").

import mongodb from "@/lib/mongodb";
import Notification, { NotificationKind } from "@/models/notification";

export type NotificationDTO = {
    _id: string;
    kind: NotificationKind;
    title: string;
    body: string;
    link?: string;
    actor_name?: string;
    read: boolean;
    created_at: string;
};

export const create_notifications_db = async (
    orgId: string,
    recipients: string[],
    payload: { kind: NotificationKind; title: string; body: string; link?: string; actor_id?: string; actor_name?: string }
) => {
    if (recipients.length === 0) return;
    await mongodb();
    await Notification.insertMany(
        recipients.map((user_id) => ({ organization_id: orgId, user_id, ...payload }))
    );
};

export const get_notifications_db = async (orgId: string, userId: string, limit = 20) => {
    await mongodb();
    const [items, unread] = await Promise.all([
        Notification.find({ organization_id: orgId, user_id: userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean<Array<Record<string, unknown>>>(),
        Notification.countDocuments({ organization_id: orgId, user_id: userId, read_at: null }),
    ]);

    return {
        unread,
        items: items.map((n) => ({
            _id: String(n._id),
            kind: n.kind as NotificationKind,
            title: String(n.title),
            body: String(n.body ?? ""),
            link: n.link ? String(n.link) : undefined,
            actor_name: n.actor_name ? String(n.actor_name) : undefined,
            read: !!n.read_at,
            created_at: new Date(n.createdAt as Date).toISOString(),
        })) satisfies NotificationDTO[],
    };
};

export const mark_notifications_read_db = async (orgId: string, userId: string, ids?: string[]) => {
    await mongodb();
    await Notification.updateMany(
        {
            organization_id: orgId,
            user_id: userId,
            read_at: null,
            ...(ids && ids.length ? { _id: { $in: ids } } : {}),
        },
        { $set: { read_at: new Date() } }
    );
};
