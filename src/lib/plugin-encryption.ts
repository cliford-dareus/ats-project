// ─────────────────────────────────────────────────────────────────────────────
// src/lib/plugin-encryption.ts — SERVER-ONLY.
// Plugin API keys (Resend, Google/Gemini, …) are stored in the `plugins` JSON
// column of the organization table. They must NEVER be stored plaintext and
// NEVER be sent to the browser in full.
//
//   • At rest:    AES-256-GCM, ciphertext prefixed `enc:v1:`.
//   • In transit: server actions return MASKED values (`••••` + last 4 chars).
//   • At use:     decrypted server-side only, at the point of use
//                 (worker dispatch, server-action email sends).
//
// Key: `PLUGIN_ENCRYPTION_KEY` env var — 32 bytes, base64 or hex. Generate
// with:  openssl rand -base64 32
// The key is required only when encryption/decryption actually runs; reads of
// legacy plaintext values and masking of plaintext values work without it.
// When the key IS needed and is missing/malformed, these helpers THROW —
// callers must fail the save, never silently store plaintext.
//
// Migration: values stored before encryption existed have no `enc:v1:` prefix.
// They are treated as legacy plaintext: readable at point of use, and
// re-encrypted (lazily) the next time the org's plugin settings are saved.
// Pre-existing keys therefore need one re-save (any plugin save for the org
// re-encrypts the whole `plugins` blob) to become encrypted.
//
// Rotation: there is no automatic key rotation. To rotate, decrypt every
// stored value with the old key and re-encrypt with the new one (a
// re-encryption pass over the `plugins` column), THEN swap the env var.
// Rotating the env var first makes every stored key undecryptable —
// point-of-use reads will throw and the settings UI will show a generic
// mask until the keys are re-entered.
//
// This file imports `node:crypto`, so importing it from client code fails
// the build — that is the guard. Do not remove the node:crypto import.
// ─────────────────────────────────────────────────────────────────────────────

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { OrgPluginRecord, OrgPluginSettings } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────
export const PLUGIN_ENCRYPTION_PREFIX = "enc:v1:";
export const PLUGIN_MASK_PREFIX = "••••";
/** Generic mask shown when the real last-4 cannot be recovered (e.g. the
 *  encryption key was rotated without a re-encryption pass). */
export const PLUGIN_MASK_GENERIC = "••••••••";

// ── Key loading ───────────────────────────────────────────────────────────────
let cached_key: Buffer | null = null;

const encryption_error = (message: string): Error =>
    new Error(`[plugin-encryption] ${message}`);

/** True when `error` came from this module — lets callers fail loudly on
 *  encryption failures instead of swallowing them into a generic error. */
export const is_plugin_encryption_error = (error: unknown): boolean =>
    error instanceof Error && error.message.startsWith("[plugin-encryption]");

/**
 * Parse `PLUGIN_ENCRYPTION_KEY` (32 bytes, base64 or hex) and cache it.
 * Throws a descriptive error when the key is missing or malformed.
 */
export const get_plugin_encryption_key = (): Buffer => {
    if (cached_key) return cached_key;

    const raw = process.env.PLUGIN_ENCRYPTION_KEY?.trim();
    if (!raw) {
        throw encryption_error(
            "PLUGIN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` " +
            "and set it in .env (server-only — never NEXT_PUBLIC_*). Plugin API keys cannot " +
            "be saved until it is configured.",
        );
    }

    let key: Buffer;
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
        key = Buffer.from(raw, "hex");
    } else {
        // Base64 (44 chars for 32 bytes, padding included).
        key = Buffer.from(raw, "base64");
    }

    if (key.length !== 32) {
        throw encryption_error(
            `PLUGIN_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). ` +
            "Generate one with `openssl rand -base64 32` (base64) or `openssl rand -hex 32` (hex).",
        );
    }

    cached_key = key;
    return key;
};

// ── Single-value encrypt / decrypt / mask ─────────────────────────────────────

/** True when `value` is already an `enc:v1:` ciphertext.
 *  Plain `boolean` (not a `value is string` guard) on purpose: a guard
 *  would narrow a `string` input to `never` on the false branch. */
export const is_encrypted_plugin_secret = (value: unknown): boolean =>
    typeof value === "string" && value.startsWith(PLUGIN_ENCRYPTION_PREFIX);

/** True when `value` is a masked display value (`••••` + last 4) — i.e. NOT a
 *  usable key. Masked values echoed back by the client must never be
 *  encrypted or stored; the stored key is preserved instead.
 *  Plain `boolean` (not a type guard) — see is_encrypted_plugin_secret. */
export const is_masked_plugin_secret = (value: unknown): boolean =>
    typeof value === "string" && value.startsWith(PLUGIN_MASK_PREFIX);

/**
 * Encrypt one secret with AES-256-GCM (random 12-byte IV per value).
 * Format: `enc:v1:<iv_b64>.<ciphertext_b64>.<tag_b64>`.
 * Idempotent: already-encrypted values pass through unchanged. Empty strings
 * pass through (callers skip empty values). Throws when the key is
 * missing/malformed — never silently returns plaintext.
 */
export const encrypt_plugin_secret = (plaintext: string): string => {
    if (!plaintext || is_encrypted_plugin_secret(plaintext)) return plaintext;

    const key = get_plugin_encryption_key();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return (
        PLUGIN_ENCRYPTION_PREFIX +
        `${iv.toString("base64")}.${ciphertext.toString("base64")}.${tag.toString("base64")}`
    );
};

/**
 * Decrypt one secret. Legacy plaintext (no `enc:v1:` prefix) passes through
 * unchanged — pre-existing keys keep working until their next re-save.
 * Throws on malformed ciphertext, tampering, or a wrong key (e.g. the env
 * var was rotated without a re-encryption pass).
 */
export const decrypt_plugin_secret = (value: string): string => {
    if (!value || !is_encrypted_plugin_secret(value)) return value;

    const key = get_plugin_encryption_key();
    const body = value.slice(PLUGIN_ENCRYPTION_PREFIX.length);
    const [iv_b64, ciphertext_b64, tag_b64] = body.split(".");
    if (!iv_b64 || !ciphertext_b64 || !tag_b64) {
        throw encryption_error("Malformed encrypted plugin secret (expected enc:v1:<iv>.<ciphertext>.<tag>).");
    }

    try {
        const decipher = createDecipheriv(
            "aes-256-gcm",
            key,
            Buffer.from(iv_b64, "base64"),
        );
        decipher.setAuthTag(Buffer.from(tag_b64, "base64"));
        return Buffer.concat([
            decipher.update(Buffer.from(ciphertext_b64, "base64")),
            decipher.final(),
        ]).toString("utf8");
    } catch {
        throw encryption_error(
            "Failed to decrypt a stored plugin API key — the value may be tampered with, " +
            "or PLUGIN_ENCRYPTION_KEY was rotated without a re-encryption pass. " +
            "Re-enter the key in plugin settings.",
        );
    }
};

/**
 * Mask a secret for display / client transport: `••••` + last 4 characters.
 * Accepts plaintext, ciphertext (decrypted first), or an already-masked
 * value (returned as-is). NEVER throws: when decryption fails (wrong key
 * after rotation) it returns a generic mask and logs, so a key-rotation
 * mishap degrades the settings display instead of bricking the page —
 * the loud failure still happens at point of use (decrypt throws there).
 */
export const mask_plugin_secret = (value: string): string => {
    if (!value) return "";
    if (is_masked_plugin_secret(value)) return value;

    let plaintext = value;
    if (is_encrypted_plugin_secret(value)) {
        try {
            plaintext = decrypt_plugin_secret(value);
        } catch (error) {
            console.warn(
                "[plugin-encryption] Could not decrypt a stored plugin key for display; " +
                "showing a generic mask. The key must be re-entered in plugin settings.",
                error,
            );
            return PLUGIN_MASK_GENERIC;
        }
    }

    if (plaintext.length <= 4) return PLUGIN_MASK_GENERIC;
    return `${PLUGIN_MASK_PREFIX}${plaintext.slice(-4)}`;
};

// ── Credential-map helpers ────────────────────────────────────────────────────

/** Encrypt every plaintext value in a credentials map. Already-encrypted
 *  values pass through; empty/non-string values are dropped. Masked values
 *  are left untouched (they are not recoverable keys — encrypting one would
 *  seal the corruption; callers must preserve the stored key instead). */
export const encrypt_plugin_credentials = (
    credentials: Record<string, string>,
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        if (typeof value !== "string" || !value) continue;
        if (is_masked_plugin_secret(value)) {
            console.warn(
                `[plugin-encryption] Refusing to encrypt a masked value for credential "${name}" — ` +
                "the stored key should have been preserved instead. Leaving it unchanged.",
            );
            out[name] = value;
            continue;
        }
        out[name] = encrypt_plugin_secret(value);
    }
    return out;
};

/** Decrypt every value in a credentials map (legacy plaintext passes
 *  through). Throws on the first undecryptable value. */
export const decrypt_plugin_credentials = (
    credentials: Record<string, string>,
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        if (typeof value !== "string" || !value) continue;
        out[name] = decrypt_plugin_secret(value);
    }
    return out;
};

/** Mask every value in a credentials map (`••••` + last 4). Never throws. */
export const mask_plugin_credentials = (
    credentials: Record<string, string>,
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        if (typeof value !== "string" || !value) continue;
        out[name] = mask_plugin_secret(value);
    }
    return out;
};

// ── Settings / record helpers ─────────────────────────────────────────────────

/** Copy of `settings` with credentials masked — safe to return to the client. */
export const mask_plugin_settings = (
    settings: OrgPluginSettings,
): OrgPluginSettings => ({
    ...settings,
    ...(settings.credentials
        ? { credentials: mask_plugin_credentials(settings.credentials) }
        : {}),
});

/** Copy of a whole plugin record with every plugin's credentials masked. */
export const mask_org_plugin_record = (
    record: OrgPluginRecord,
): OrgPluginRecord => {
    const settings: Record<string, OrgPluginSettings> = {};
    for (const [pluginId, plugin_settings] of Object.entries(record.settings ?? {})) {
        settings[pluginId] = mask_plugin_settings(plugin_settings);
    }
    return { ...record, settings };
};

/**
 * Encrypt every plaintext credential in a whole plugin record (lazy
 * migration pass — run on save so one re-save encrypts the org's other
 * plugins too). Already-encrypted values pass through. Throws when the
 * key is missing/malformed AND there is plaintext to encrypt — callers
 * that run this opportunistically must catch and continue.
 */
export const encrypt_org_plugin_record_credentials = (
    record: OrgPluginRecord,
): OrgPluginRecord => {
    const settings: Record<string, OrgPluginSettings> = {};
    for (const [pluginId, plugin_settings] of Object.entries(record.settings ?? {})) {
        settings[pluginId] = plugin_settings.credentials
            ? {
                  ...plugin_settings,
                  credentials: encrypt_plugin_credentials(plugin_settings.credentials),
              }
            : plugin_settings;
    }
    return { ...record, settings };
};

/**
 * Resolve the credentials to store for one plugin save.
 *
 *   • `incoming` undefined → the client didn't touch credentials: preserve
 *     the stored (encrypted) values.
 *   • `incoming` empty + `clear_on_empty` (disconnect: active === false) →
 *     clear the stored credentials.
 *   • Per key: masked echoes (`••••…`) preserve the stored value (the client
 *     only ever sees masked values, so a settings/config save echoes them
 *     back); values identical to the stored value are preserved as-is
 *     (legacy plaintext is re-encrypted by the migration pass, not here);
 *     new plaintext is encrypted — and THAT is where a missing/malformed
 *     key throws, so a new key is never stored plaintext.
 *   • Empty-string values drop that credential.
 */
export const resolve_saved_plugin_credentials = (
    existing: Record<string, string> | undefined,
    incoming: Record<string, string> | undefined,
    opts?: { clear_on_empty?: boolean },
): Record<string, string> | undefined => {
    if (incoming === undefined) return existing;

    const incoming_keys = Object.keys(incoming);
    if (incoming_keys.length === 0) {
        return opts?.clear_on_empty ? {} : existing;
    }

    const next: Record<string, string> = { ...(existing ?? {}) };
    for (const [name, value] of Object.entries(incoming)) {
        if (typeof value !== "string" || !value) {
            delete next[name];
            continue;
        }
        if (is_masked_plugin_secret(value)) continue; // keep stored value
        if (is_encrypted_plugin_secret(value)) {
            next[name] = value;
            continue;
        }
        if (value === existing?.[name]) continue; // unchanged legacy value
        next[name] = encrypt_plugin_secret(value); // throws if key unusable
    }
    return next;
};
