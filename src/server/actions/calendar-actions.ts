"use server";

import { auth } from "@clerk/nextjs/server";
import { getOAuthClient } from "@/server/google-calenda";

/**
 * D9 — Google Calendar connection state for interview scheduling.
 *
 * The scheduling flow uses the signed-in user's Clerk `oauth_google`
 * token (see getOAuthClient in src/server/google-calenda.ts), so this
 * takes no org input: the token is per-user, and orgId always comes
 * from the auth() session, never from the client. The token itself is
 * never exposed — only whether a usable client could be built from it.
 */
export async function get_calendar_connection_action(): Promise<{
  connected: boolean;
}> {
  const { userId } = await auth();
  if (!userId) return { connected: false };

  const client = await getOAuthClient(userId);
  return { connected: client != null };
}
