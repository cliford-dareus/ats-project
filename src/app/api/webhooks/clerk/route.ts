import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { assignAdminRoleToFirstUser } from "@/lib/assignAdminRole";
import { organization_member, usersTable } from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
    const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!SIGNING_SECRET) {
        throw new Error("SIGNING_SECRET is required");
    }

    const wh = new Webhook(SIGNING_SECRET)

    const headerPayload = await headers()
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_signature || !svix_timestamp) {
        return new Response('Error: Missing parameter Svix Header', {
            status: 400,
        });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    let evt: WebhookEvent

    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature
        }) as WebhookEvent
    } catch (e) {
        console.error('Error verifying Svix:', e);
        return new Response('Error', {
            status: 400,
        })
    }

    switch (evt.type) {
        case "user.created": {
            // Assign admin role to first user
            await assignAdminRoleToFirstUser(evt.data.id);

            await db.insert(usersTable).values({
                id: evt.data.id,
                name: [evt.data.first_name, evt.data.last_name].filter(Boolean).join(' ')
                    || evt.data.username
                    || 'User',
                email: evt.data.email_addresses[0]?.email_address ?? '',
                image_url: evt.data.image_url,
                username: evt.data.username ?? undefined,
            }).onDuplicateKeyUpdate({});

            break
        }

        case "user.deleted": {
            console.log(`User deleted`);           
        }

        case "organization.created": {
        }

        case "organizationMembership.created": {
            await upsertOrganizationMembership(evt.data);
            break;
        }

        case "organizationMembership.updated": {
            // Role changes (e.g. member → admin)
            await upsertOrganizationMembership(evt.data);
            break;
        }

        case "organizationMembership.deleted": {
            const userId = evt.data.public_user_data?.user_id;
            const organizationId = evt.data.organization?.id;

            if (userId && organizationId) {
                await db
                    .delete(organization_member)
                    .where(
                        and(
                            eq(organization_member.user_id, userId),
                            eq(organization_member.organization_id, organizationId)
                        )
                    );
            }
            break;
        }
    }

    return new Response("", { status: 200 })
}

async function upsertOrganizationMembership(
    data: Extract<
        WebhookEvent,
        { type: "organizationMembership.created" | "organizationMembership.updated" }
    >["data"]
) {
    const userId = data?.public_user_data?.user_id;
    const organizationId = data?.organization?.id;
    const role = data?.role ?? "org:member";

    if (!userId || !organizationId) {
        console.warn("[clerk webhook] membership missing userId or organizationId", {
            userId,
            organizationId,
        });
        return;
    }

    // 1) Ensure user exists (FK on organization_member.user_id)
    const existing = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

    if (existing.length === 0) {
        const pub = data?.public_user_data;
        const name =
            [pub?.first_name, pub?.last_name].filter(Boolean).join(" ") ||
            pub?.identifier ||
            "User";

        await db.insert(usersTable).values({
            id: userId,
            name,
            email: pub?.identifier ?? `${userId}@unknown.local`,
            image_url: pub?.image_url ?? null,
            username: null,
        });
    }

    // 2) Upsert membership
    await db
        .insert(organization_member)
        .values({
            user_id: userId,
            organization_id: organizationId,
            role,
        })
        .onDuplicateKeyUpdate({
            set: { role },
        });
}
