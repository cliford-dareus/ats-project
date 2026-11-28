"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Outbound webhooks — management UI (feat/plugin-webhooks).
//
// Subscriptions: destination URL + subscribed events. Create returns the
// signing secret ONCE — it is shown in a highlighted box with a copy
// button and a warning, and never sent to the browser again afterwards
// (the list only ever carries the masked secret, •••• + last 4).
//
// Delivery log: one row per ATTEMPT (BullMQ retries a failed POST up to
// 3×), with status, HTTP status code, response snippet, duration and
// timestamp. A failed delivery is visible here — never silently swallowed.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    create_webhook_subscription_action,
    delete_webhook_subscription_action,
    list_webhook_deliveries_action,
    list_webhook_subscriptions_action,
    type WebhookDeliveryView,
    type WebhookSubscriptionView,
} from "@/server/actions/webhook-actions";
import {
    WEBHOOK_EVENT_META,
    WEBHOOK_EVENTS,
    type WebhookEventType,
} from "@/lib/webhooks/events";

type SubscriptionView = Omit<WebhookSubscriptionView, "created_at" | "updated_at"> & {
    created_at: string;
    updated_at: string;
};

type DeliveryView = Omit<WebhookDeliveryView, "created_at"> & {
    created_at: string;
};

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const statusBadge = (status: WebhookDeliveryView["status"]) => {
    if (status === "delivered") {
        return <Badge className="bg-emerald-600 hover:bg-emerald-600">Delivered</Badge>;
    }
    if (status === "failed") {
        return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="secondary">Error</Badge>;
};

const WebhooksClient = ({
    initialSubscriptions,
    initialDeliveries,
}: {
    initialSubscriptions: SubscriptionView[];
    initialDeliveries: DeliveryView[];
}) => {
    const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
    const [deliveries, setDeliveries] = useState(initialDeliveries);
    const [url, setUrl] = useState("");
    const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([
        "candidate_applied",
        "stage_changed",
        "interview_scheduled",
        "interview_cancelled",
    ]);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    // The one-time secret: set only by the create response, cleared by the
    // user dismissing it. It is never fetched again afterwards.
    const [oneTimeSecret, setOneTimeSecret] = useState<{
        subscriptionId: number;
        secret: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const refresh = async () => {
        setRefreshing(true);
        const result = await list_webhook_subscriptions_action();
        setRefreshing(false);
        if (result.ok) {
            setSubscriptions(
                result.data.subscriptions.map((s) => ({
                    ...s,
                    created_at: s.created_at.toISOString(),
                    updated_at: s.updated_at.toISOString(),
                })),
            );
            setDeliveries(
                result.data.deliveries.map((d) => ({
                    ...d,
                    created_at: d.created_at.toISOString(),
                })),
            );
        }
    };

    const toggleEvent = (event: WebhookEventType, checked: boolean) => {
        setSelectedEvents((prev) =>
            checked ? [...prev, event] : prev.filter((e) => e !== event),
        );
    };

    const handleCreate = async () => {
        setFormError(null);
        setOneTimeSecret(null);
        setCopied(false);
        if (!url.trim()) {
            setFormError("Enter a destination URL.");
            return;
        }
        if (selectedEvents.length === 0) {
            setFormError("Subscribe to at least one event.");
            return;
        }
        setCreating(true);
        const result = await create_webhook_subscription_action({
            url: url.trim(),
            events: selectedEvents,
        });
        setCreating(false);
        if (!result.ok) {
            setFormError(result.error);
            return;
        }
        setOneTimeSecret({
            subscriptionId: result.data.subscription.id,
            secret: result.data.signing_secret,
        });
        setUrl("");
        await refresh();
    };

    const handleDelete = async (subscriptionId: number) => {
        setDeletingId(subscriptionId);
        const result = await delete_webhook_subscription_action(subscriptionId);
        setDeletingId(null);
        if (!result.ok) {
            setFormError(result.error);
            return;
        }
        if (oneTimeSecret?.subscriptionId === subscriptionId) {
            setOneTimeSecret(null);
        }
        await refresh();
    };

    const handleFilterDeliveries = async (subscriptionId: number | null) => {
        const result = await list_webhook_deliveries_action(
            subscriptionId ?? undefined,
        );
        if (result.ok) {
            setDeliveries(
                result.data.deliveries.map((d) => ({
                    ...d,
                    created_at: d.created_at.toISOString(),
                })),
            );
        }
    };

    const copySecret = async () => {
        if (!oneTimeSecret) return;
        try {
            await navigator.clipboard.writeText(oneTimeSecret.secret);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Webhooks</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Send signed JSON payloads to your own endpoints (Zapier,
                    Make, or your server) when applications and interviews
                    change. Each subscription gets an HMAC signing secret so
                    your endpoint can verify the payload really came from
                    Applico.
                </p>
            </div>

            {oneTimeSecret && (
                <Card className="border-amber-500">
                    <CardHeader>
                        <CardTitle>Copy your signing secret now</CardTitle>
                        <CardDescription>
                            This secret is shown exactly once. It will never be
                            displayed again — store it where your endpoint can
                            use it to verify the{" "}
                            <code>X-Applico-Signature</code> header. To rotate
                            it, delete this subscription and create a new one.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <code className="block break-all rounded-md bg-muted p-3 text-sm">
                            {oneTimeSecret.secret}
                        </code>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={copySecret}>
                                {copied ? "Copied" : "Copy secret"}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setOneTimeSecret(null)}
                            >
                                I&apos;ve saved it
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>New subscription</CardTitle>
                    <CardDescription>
                        Deliveries are retried up to 3 times with backoff when
                        your endpoint fails or times out (10s). Every attempt
                        is recorded in the delivery log below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="webhook-url">Destination URL</Label>
                        <Input
                            id="webhook-url"
                            type="url"
                            placeholder="https://hooks.zapier.com/hooks/catch/…"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Must be an https URL. Localhost is not allowed.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Events</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {WEBHOOK_EVENTS.map((event) => (
                                <label
                                    key={event}
                                    className="flex items-start gap-2 rounded-md border p-3 cursor-pointer"
                                >
                                    <Checkbox
                                        checked={selectedEvents.includes(event)}
                                        onCheckedChange={(checked) =>
                                            toggleEvent(event, checked === true)
                                        }
                                    />
                                    <span>
                                        <span className="block text-sm font-medium">
                                            {WEBHOOK_EVENT_META[event].label}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            {WEBHOOK_EVENT_META[event].description}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {formError && (
                        <p className="text-sm text-destructive">{formError}</p>
                    )}
                    <Button onClick={handleCreate} disabled={creating}>
                        {creating ? "Creating…" : "Create subscription"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Subscriptions</CardTitle>
                    <CardDescription>
                        {subscriptions.length === 0
                            ? "No subscriptions yet."
                            : `${subscriptions.length} subscription${subscriptions.length === 1 ? "" : "s"}. Secrets are shown masked — the full secret was displayed once at creation.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {subscriptions.map((sub) => (
                        <div
                            key={sub.id}
                            className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0 space-y-1">
                                <p className="truncate text-sm font-medium">
                                    {sub.url}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {(sub.events ?? []).map((event) => (
                                        <Badge key={event} variant="outline">
                                            {event}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Signing secret {sub.signing_secret_masked}
                                    {" · "}Created {formatTime(sub.created_at)}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleFilterDeliveries(sub.id)}
                                >
                                    View deliveries
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={deletingId === sub.id}
                                    onClick={() => void handleDelete(sub.id)}
                                >
                                    {deletingId === sub.id ? "Deleting…" : "Delete"}
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Delivery log</CardTitle>
                        <CardDescription>
                            One row per attempt — a failed delivery stays
                            visible here with its status code and response.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleFilterDeliveries(null)}
                        >
                            All
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={refreshing}
                            onClick={() => void refresh()}
                        >
                            {refreshing ? "Refreshing…" : "Refresh"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {deliveries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No deliveries yet. Deliveries appear here once a
                            subscribed event fires.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {deliveries.map((delivery) => (
                                <div
                                    key={delivery.id}
                                    className="rounded-md border p-3 space-y-1"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        {statusBadge(delivery.status)}
                                        <span className="text-sm font-medium">
                                            {delivery.event}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {delivery.destination_host ??
                                                `subscription #${delivery.subscription_id}`}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatTime(delivery.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Attempt {delivery.attempt}
                                        {delivery.status_code !== null &&
                                            ` · HTTP ${delivery.status_code}`}
                                        {delivery.duration_ms !== null &&
                                            ` · ${delivery.duration_ms}ms`}
                                        {` · delivery ${delivery.delivery_id.slice(0, 8)}…`}
                                    </p>
                                    {delivery.error_message && (
                                        <p className="text-xs text-destructive">
                                            {delivery.error_message}
                                        </p>
                                    )}
                                    {delivery.response_snippet && (
                                        <code className="block break-all rounded bg-muted p-2 text-xs">
                                            {delivery.response_snippet}
                                        </code>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WebhooksClient;
