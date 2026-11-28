// ─────────────────────────────────────────────────────────────────────────────
// Outbound webhooks — Settings page (feat/plugin-webhooks).
//
// Own Settings surface, NOT a [pluginId] config page: webhooks are org
// infrastructure, not a third-party provider. plugin:manage-gated, like
// the plugin manager (only org:admin holds it today).
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasPermission } from "@/server/permissions";
import {
    list_webhook_subscriptions_action,
    type WebhookDeliveryView,
    type WebhookSubscriptionView,
} from "@/server/actions/webhook-actions";
import WebhooksClient from "./_components/webhooks-client";

// Server→client props must be plain JSON: normalize Dates to ISO strings
// here so the client never has to guess what a Date became in flight.
const toClientProps = (result: {
    subscriptions: WebhookSubscriptionView[];
    deliveries: WebhookDeliveryView[];
}) => ({
    subscriptions: result.subscriptions.map((s) => ({
        ...s,
        created_at: s.created_at.toISOString(),
        updated_at: s.updated_at.toISOString(),
    })),
    deliveries: result.deliveries.map((d) => ({
        ...d,
        created_at: d.created_at.toISOString(),
    })),
});

const WebhooksPage = async () => {
    const { userId, orgId } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/onboarding");

    if (!(await hasPermission("plugin:manage"))) {
        return (
            <div className="p-6 space-y-2">
                <h1 className="text-xl font-semibold">Webhooks</h1>
                <p className="text-muted-foreground text-sm">
                    You don&apos;t have permission to manage webhooks. Ask an
                    organization admin.
                </p>
            </div>
        );
    }

    const result = await list_webhook_subscriptions_action();
    if (!result.ok) {
        return (
            <div className="p-6 space-y-2">
                <h1 className="text-xl font-semibold">Webhooks</h1>
                <p className="text-destructive text-sm">{result.error}</p>
            </div>
        );
    }

    const props = toClientProps(result.data);

    return (
        <div className="p-6 space-y-6">
            <WebhooksClient
                initialSubscriptions={props.subscriptions}
                initialDeliveries={props.deliveries}
            />
        </div>
    );
};

export default WebhooksPage;
