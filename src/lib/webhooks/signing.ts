// ─────────────────────────────────────────────────────────────────────────────
// src/lib/webhooks/signing.ts — HMAC signing for outbound webhooks.
//
// Stripe/Svix-style scheme: the signature covers the delivery timestamp
// AND the raw body, so a captured payload cannot be replayed later
// without failing the timestamp check on the receiver's side, and the
// body cannot be tampered with in transit.
//
//   X-Applico-Signature: t=<unix seconds>,v1=<hex hmac-sha256>
//   where the signed message is "<t>.<raw JSON body>" and the key is the
//   subscription's signing secret (the base64 string generated at
//   creation, used as-is as the HMAC key).
//
//   X-Applico-Event:        the event type, e.g. "stage_changed"
//   X-Applico-Delivery-Id:  uuid grouping the attempts of one delivery
//                           (receivers can dedupe at-least-once redelivery)
//
// Secrets are generated with crypto.randomBytes and stored AES-256-GCM
// encrypted (encrypt_plugin_secret) — this module never persists or logs
// one. Receivers verify with `verify_webhook_signature` below.
// ─────────────────────────────────────────────────────────────────────────────
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const WEBHOOK_SIGNATURE_HEADER = "X-Applico-Signature";
export const WEBHOOK_EVENT_HEADER = "X-Applico-Event";
export const WEBHOOK_DELIVERY_ID_HEADER = "X-Applico-Delivery-Id";

/** Generate a fresh signing secret (base64, 32 random bytes). Shown once
 *  at subscription creation; the caller must encrypt it before storing. */
export const generate_webhook_signing_secret = (): string =>
    randomBytes(32).toString("base64");

/**
 * Sign a raw JSON body. Returns the full header value
 * (`t=<unix>,v1=<hex>`). `timestampSeconds` defaults to now — pass an
 * explicit value only in tests.
 */
export const sign_webhook_payload = (
    secret: string,
    rawBody: string,
    timestampSeconds: number = Math.floor(Date.now() / 1000),
): string => {
    const signed = `${timestampSeconds}.${rawBody}`;
    const digest = createHmac("sha256", secret).update(signed, "utf8").digest("hex");
    return `t=${timestampSeconds},v1=${digest}`;
};

/**
 * Verify a received signature header against the raw body and secret.
 * `maxAgeSeconds` bounds replay (default 5 minutes, Stripe's window).
 * Returns false on any malformed input — never throws.
 */
export const verify_webhook_signature = (
    secret: string,
    rawBody: string,
    signatureHeader: string | null | undefined,
    maxAgeSeconds: number = 300,
): boolean => {
    if (!secret || !signatureHeader) return false;
    const match = /^t=(\d+),v1=([0-9a-fA-F]+)$/.exec(signatureHeader.trim());
    if (!match) return false;

    const timestamp = Number(match[1]);
    const presented = match[2]!.toLowerCase();
    if (!Number.isFinite(timestamp)) return false;
    if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > maxAgeSeconds) return false;

    const expected = createHmac("sha256", secret)
        .update(`${timestamp}.${rawBody}`, "utf8")
        .digest("hex");

    const a = Buffer.from(presented, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
};
