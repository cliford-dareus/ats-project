import {Webhook} from "svix";
import {headers} from "next/headers";
import { WebhookEvent} from "@clerk/nextjs/server";
import {assignAdminRoleToFirstUser} from "@/lib/assignAdminRole";

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
            await assignAdminRoleToFirstUser(evt.data.id)
            break
        }
        case "user.deleted": {
        }
        case "organization.created": {
        }
    }

    return new Response("", {status: 200})
}
