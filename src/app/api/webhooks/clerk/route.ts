import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { assignAdminRoleToFirstUser } from "@/lib/assignAdminRole";
import { organization_member, users_table } from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
    const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!SIGNING_SECRET) {
        throw new Error("SIGNING_SECRET is required");
    }

    const wh = new Webhook(SIGNING_SECRET);

    const header_payload = await headers();
    const svix_id = header_payload.get("svix-id");
    const svix_timestamp = header_payload.get("svix-timestamp");
    const svix_signature = header_payload.get("svix-signature");

    if (!svix_id || !svix_signature || !svix_timestamp) {
        return new Response("Error: Missing parameter Svix Header", {
            status: 400,
        });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    let evt: WebhookEvent;

    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (e) {
        console.error("Error verifying Svix:", e);
        return new Response("Error", {
            status: 400,
        });
    }

    switch (evt.type) {
        case "user.created": {
            await assignAdminRoleToFirstUser(evt.data.id);

            const full_name =
                [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") ||
                evt.data.username ||
                "User";

            await db
                .insert(users_table)
                .values({
                    id: evt.data.id,
                    name: full_name,
                    email: evt.data.email_addresses[0]?.email_address ?? "",
                    image_url: evt.data.image_url,
                    username: evt.data.username ?? undefined,
                })
                .onDuplicateKeyUpdate({
                    set: {
                        name: full_name,
                        email: evt.data.email_addresses[0]?.email_address ?? "",
                        image_url: evt.data.image_url,
                        username: evt.data.username ?? undefined,
                    },
                });

            break;
        }

        case "user.deleted": {
            if (evt.data.id) {
                await db.delete(users_table).where(eq(users_table.id, evt.data.id));
            }
            break;
        }

        case "organization.created": {
            break;
        }

        case "organizationMembership.created": {
            await upsert_organization_membership(evt.data);
            break;
        }

        case "organizationMembership.updated": {
            await upsert_organization_membership(evt.data);
            break;
        }

        case "organizationMembership.deleted": {
            const user_id = evt.data.public_user_data?.user_id;
            const organization_id = evt.data.organization?.id;

            if (user_id && organization_id) {
                await db
                    .delete(organization_member)
                    .where(
                        and(
                            eq(organization_member.user_id, user_id),
                            eq(organization_member.organization_id, organization_id)
                        )
                    );
            }
            break;
        }
    }

    return new Response("", { status: 200 });
}

async function upsert_organization_membership(
    data: Extract<
        WebhookEvent,
        { type: "organizationMembership.created" | "organizationMembership.updated" }
    >["data"]
) {
    const user_id = data?.public_user_data?.user_id;
    const organization_id = data?.organization?.id;
    const role = data?.role ?? "org:member";

    if (!user_id || !organization_id) {
        console.warn("[clerk webhook] membership missing user_id or organization_id", {
            user_id,
            organization_id,
        });
        return;
    }

    const existing = await db
        .select({ id: users_table.id })
        .from(users_table)
        .where(eq(users_table.id, user_id))
        .limit(1);

    if (existing.length === 0) {
        const pub = data?.public_user_data;
        const full_name =
            [pub?.first_name, pub?.last_name].filter(Boolean).join(" ") ||
            pub?.identifier ||
            "User";

        await db.insert(users_table).values({
            id: user_id,
            name: full_name,
            email: pub?.identifier ?? `${user_id}@unknown.local`,
            image_url: pub?.image_url ?? null,
            username: null,
        });
    }

    await db
        .insert(organization_member)
        .values({
            user_id,
            organization_id,
            role,
        })
        .onDuplicateKeyUpdate({
            set: { role },
        });
}
