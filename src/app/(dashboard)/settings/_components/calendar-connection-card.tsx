"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Calendar, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { get_calendar_connection_action } from "@/server/actions/calendar-actions";

/** Calendar scope: the linked token must be able to create/read events,
 * not just identify the user (Clerk's Google defaults are openid/email/
 * profile only). */
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

/**
 * D9 — Google Calendar connection card for Settings → General.
 *
 * Shows the ACTUAL connection state (from get_calendar_connection_action,
 * which reports whether Clerk currently holds a usable oauth_google
 * token) — never a hardcoded badge.
 *
 * Connect: the user is already signed in, so this links a Google account
 * to the existing Clerk user via `user.createExternalAccount` (strategy
 * "oauth_google", redirecting back to this settings page). When a Google
 * account is already linked but the token is unusable (revoked/expired),
 * `reauthorize` refreshes it instead. `signIn.authenticateWithRedirect`
 * is NOT used here: it lives on the SignIn/SignUp resources (a sign-in
 * flow needing an /sso-callback route, which this app does not have),
 * not on the signed-in user.
 *
 * Disconnect: there is no server-side Clerk API that deletes an OAuth
 * token / external account (the Backend API only reads tokens via
 * getUserOauthAccessToken), but the signed-in user's own
 * ExternalAccountResource has a real `destroy()` — that is what the
 * Disconnect button calls, then the card re-checks state. Destroying
 * the Clerk-side link stops Applico using the token; the Google-side
 * grant itself is revoked at myaccount.google.com/permissions, linked
 * below.
 */
const CalendarConnectionCard = () => {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<"loading" | "connected" | "not-connected">(
    "loading",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const googleAccount = user?.externalAccounts.find(
    (account) => account.provider === "google",
  );

  const refresh = useCallback(async () => {
    const result = await get_calendar_connection_action();
    setStatus(result.connected ? "connected" : "not-connected");
  }, []);

  useEffect(() => {
    refresh().catch(() => setStatus("not-connected"));
  }, [refresh]);

  const handleConnect = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const redirectUrl = window.location.href;
      if (googleAccount) {
        await googleAccount.reauthorize({
          redirectUrl,
          additionalScopes: [GOOGLE_CALENDAR_SCOPE],
        });
      } else {
        await user.createExternalAccount({
          strategy: "oauth_google",
          redirectUrl,
          additionalScopes: [GOOGLE_CALENDAR_SCOPE],
        });
      }
      // The OAuth flow navigates away and back here; the mount effect
      // re-checks the real state on return.
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not start the Google connection flow",
      );
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!googleAccount) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await googleAccount.destroy();
      await refresh();
      setNotice(
        "Google Calendar disconnected. Applico can no longer create interview events.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not disconnect Google Calendar",
      );
    } finally {
      setBusy(false);
    }
  };

  const connected = status === "connected";

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Interview holds and scheduling create events on your Google
          Calendar. Without a connection, scheduling fails with
          &ldquo;Google Calendar not connected&rdquo;.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {status === "loading" || !isLoaded ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection…
            </span>
          ) : connected ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
              {googleAccount?.emailAddress
                ? ` · ${googleAccount.emailAddress}`
                : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              <XCircle className="h-3.5 w-3.5" />
              Not connected
            </span>
          )}

          {connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={busy || !googleAccount}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={busy || !isLoaded}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Connect Google Calendar
            </Button>
          )}
        </div>

        {connected && (
          <p className="text-xs text-muted-foreground">
            Disconnecting removes Applico&apos;s access token. To also revoke
            the grant on Google&apos;s side, remove Applico at{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              myaccount.google.com/permissions
            </a>
            .
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && !error && <p className="text-sm text-emerald-700">{notice}</p>}
      </CardContent>
    </Card>
  );
};

export default CalendarConnectionCard;
