"use server";

import { google, calendar_v3 } from "googleapis";
import { clerkClient } from "@clerk/nextjs/server";
import { endOfDay, startOfDay } from "date-fns";

export async function getCalendarEventTimes(
  userId: string,
  { start, end }: { start: Date; end: Date }
): Promise<{ id?: string; summary?: string; start: Date; end: Date }[]> {
  const client = await getOAuthClient(userId);
  if (!client) return [];

  const events = await google.calendar("v3").events.list({
    calendarId: "primary",
    eventTypes: ["default"],
    singleEvents: true,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    maxResults: 2500,
    auth: client,
  });

  return events.data.items
    ?.map((event) => {
      if (event.start?.date != null && event.end?.date != null) {
        return {
          id: event.id ?? undefined,
          summary: event.summary ?? undefined,
          start: startOfDay(new Date(event.start.date)),
          end: endOfDay(new Date(event.end.date)),
        };
      }

      if (event.start?.dateTime != null && event.end?.dateTime != null) {
        return {
          id: event.id ?? undefined,
          summary: event.summary ?? undefined,
          start: new Date(event.start.dateTime),
          end: new Date(event.end.dateTime),
        };
      }
    })
    .filter((event) => event != null) as { id?: string; summary?: string; start: Date; end: Date }[];
}

export async function createCalendarEvent({
  clerkUserId,
  payload,
}: {
  clerkUserId: string;
  payload: {
    summary: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    attendeeEmail: string;
    interviewerEmails?: string[];
  };
}) {
  const oAuthClient = await getOAuthClient(clerkUserId);
  if (!oAuthClient) {
    return { success: false as const, error: "Google Calendar not connected" };
  }

  const calendar = await clerkClient();
  const calendarUser = await calendar.users.getUser(clerkUserId);

  const { summary, description, startDateTime, endDateTime, attendeeEmail } =
    payload;

  if (calendarUser.primaryEmailAddress == null) {
    throw new Error("Clerk user has no email");
  }

  const event = {
    summary,
    description,
    start: {
      dateTime: startDateTime,
      timeZone: "UTC",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "UTC",
    },
    attendees: [
      { email: attendeeEmail },
      ...(payload.interviewerEmails ?? []).map((email) => ({ email })),
    ],
    status: "confirmed" as const,
  };

  try {
    const calendarEvent = await google.calendar("v3").events.insert({
      calendarId: "primary",
      auth: oAuthClient,
      sendUpdates: "all",
      requestBody: event,
    });

    return {
      success: true as const,
      event: calendarEvent.data,
      eventId: calendarEvent.data.id ?? undefined,
      meetLink: calendarEvent.data.hangoutLink ?? undefined,
    };
  } catch (error) {
    console.error("Error creating event", error);
    return { success: false as const, error: "Failed to create calendar event" };
  }
}

/**
 * Place a TENTATIVE hold on the interviewer's calendar.
 * Blocks the slot (opaque) but marks status tentative until the candidate confirms.
 */
export async function createTentativeHoldEvent({
  clerkUserId,
  payload,
}: {
  clerkUserId: string;
  payload: {
    summary: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    interviewerEmails?: string[];
    candidateEmail?: string;
  };
}) {
  const oAuthClient = await getOAuthClient(clerkUserId);
  if (!oAuthClient) {
    return { success: false as const, error: "Google Calendar not connected" };
  }

  const attendees = [
    ...(payload.interviewerEmails ?? []).map((email) => ({
      email,
      responseStatus: "needsAction" as const,
    })),
  ];

  try {
    const calendarEvent = await google.calendar("v3").events.insert({
      calendarId: "primary",
      auth: oAuthClient,
      // Don't email the candidate until they confirm — interviewers only
      sendUpdates: attendees.length ? "all" : "none",
      requestBody: {
        summary: `[HOLD] ${payload.summary}`,
        description:
          payload.description +
          "\n\n— This is a tentative hold. The slot will be confirmed or released when the candidate responds.",
        start: {
          dateTime: payload.startDateTime,
          timeZone: "UTC",
        },
        end: {
          dateTime: payload.endDateTime,
          timeZone: "UTC",
        },
        status: "tentative",
        transparency: "opaque", // blocks the slot
        attendees,
        extendedProperties: {
          private: {
            applico_hold: "true",
          },
        },
      },
    });

    return {
      success: true as const,
      eventId: calendarEvent.data.id ?? undefined,
      htmlLink: calendarEvent.data.htmlLink ?? undefined,
      meetLink: calendarEvent.data.hangoutLink ?? undefined,
    };
  } catch (error) {
    console.error("[createTentativeHoldEvent]", error);
    return {
      success: false as const,
      error: "Failed to place calendar hold",
    };
  }
}

/** True when a Google API error means the event is already gone (safe to treat as released). */
function is_not_found_error(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  const status = (error as { response?: { status?: unknown } })?.response
    ?.status;
  return code === 404 || code === "404" || status === 404;
}

/**
 * Promote a tentative hold to a confirmed interview event.
 * Fetches the existing event first so interviewer attendees placed on the
 * hold are kept — patching with only the candidate would drop them.
 * Returns `notFound` when the tentative event was deleted, so the caller
 * can recreate it as a fresh confirmed event instead.
 */
export async function confirmCalendarHold({
  clerkUserId,
  eventId,
  payload,
}: {
  clerkUserId: string;
  eventId: string;
  payload: {
    summary: string;
    description?: string;
    candidateEmail: string;
    meetLink?: string;
  };
}): Promise<
  | { success: true; eventId: string; meetLink?: string }
  | { success: false; error: string; notFound?: boolean }
> {
  const oAuthClient = await getOAuthClient(clerkUserId);
  if (!oAuthClient) {
    return { success: false as const, error: "Google Calendar not connected" };
  }

  const calendar = google.calendar("v3");

  // Read the hold first: keep its interviewer attendees and description.
  // NOTE: do not type this via ReturnType<typeof calendar.events.get> —
  // the overloaded signature resolves to void and breaks inference below.
  let existing: calendar_v3.Schema$Event | null = null;
  try {
    const res = await calendar.events.get({
      calendarId: "primary",
      eventId,
      auth: oAuthClient,
    });
    existing = res.data;
  } catch (error) {
    if (is_not_found_error(error)) {
      return {
        success: false as const,
        error: "Calendar hold no longer exists",
        notFound: true,
      };
    }
    console.error("[confirmCalendarHold] failed to read hold event", error);
    return { success: false as const, error: "Failed to confirm calendar hold" };
  }

  const attendeeEmails = new Set(
    (existing.attendees ?? [])
      .map((a) => a.email)
      .filter((email): email is string => !!email)
  );
  attendeeEmails.add(payload.candidateEmail);
  const attendees = [...attendeeEmails].map((email) => ({ email }));
  const description = [existing.description, payload.description]
    .filter(Boolean)
    .join("\n\n");

  try {
    const calendarEvent = await calendar.events.patch({
      calendarId: "primary",
      eventId,
      auth: oAuthClient,
      sendUpdates: "all",
      requestBody: {
        summary: payload.summary,
        description: description || undefined,
        status: "confirmed",
        transparency: "opaque",
        attendees,
      },
    });

    return {
      success: true as const,
      eventId: calendarEvent.data.id ?? eventId,
      meetLink:
        calendarEvent.data.hangoutLink ?? payload.meetLink ?? undefined,
    };
  } catch (error) {
    console.error("[confirmCalendarHold]", error);
    if (is_not_found_error(error)) {
      return {
        success: false as const,
        error: "Calendar hold no longer exists",
        notFound: true,
      };
    }
    return { success: false as const, error: "Failed to confirm calendar hold" };
  }
}

/**
 * Move an existing confirmed interview event to a new time, keeping its
 * attendees (interviewers + candidate) — the event is read first, exactly
 * like confirmCalendarHold, so patching never drops anyone.
 * Returns `notFound` when the event was deleted, so the caller can
 * recreate it as a fresh event instead.
 */
export async function updateCalendarEvent({
  clerkUserId,
  eventId,
  payload,
}: {
  clerkUserId: string;
  eventId: string;
  payload: {
    startDateTime: string;
    endDateTime: string;
    summary?: string;
    description?: string;
  };
}): Promise<
  | { success: true; eventId: string; meetLink?: string }
  | { success: false; error: string; notFound?: boolean }
> {
  const oAuthClient = await getOAuthClient(clerkUserId);
  if (!oAuthClient) {
    return { success: false as const, error: "Google Calendar not connected" };
  }

  const calendar = google.calendar("v3");

  // Read the event first: keep its attendees (candidate + interviewers).
  let existing: calendar_v3.Schema$Event | null = null;
  try {
    const res = await calendar.events.get({
      calendarId: "primary",
      eventId,
      auth: oAuthClient,
    });
    existing = res.data;
  } catch (error) {
    if (is_not_found_error(error)) {
      return {
        success: false as const,
        error: "Calendar event no longer exists",
        notFound: true,
      };
    }
    console.error("[updateCalendarEvent] failed to read event", error);
    return { success: false as const, error: "Failed to read calendar event" };
  }

  try {
    const calendarEvent = await calendar.events.patch({
      calendarId: "primary",
      eventId,
      auth: oAuthClient,
      sendUpdates: "all",
      requestBody: {
        ...(payload.summary ? { summary: payload.summary } : {}),
        ...(payload.description ? { description: payload.description } : {}),
        start: {
          dateTime: payload.startDateTime,
          timeZone: "UTC",
        },
        end: {
          dateTime: payload.endDateTime,
          timeZone: "UTC",
        },
        attendees: existing.attendees ?? undefined,
      },
    });

    return {
      success: true as const,
      eventId: calendarEvent.data.id ?? eventId,
      meetLink: calendarEvent.data.hangoutLink ?? undefined,
    };
  } catch (error) {
    console.error("[updateCalendarEvent]", error);
    if (is_not_found_error(error)) {
      return {
        success: false as const,
        error: "Calendar event no longer exists",
        notFound: true,
      };
    }
    return { success: false as const, error: "Failed to update calendar event" };
  }
}

/**
 * Release / cancel a hold so the slot is free again.
 * Deleting an already-deleted event counts as success. On failure,
 * `retryable` tells the caller whether retrying later can help
 * (transient API error) or not (owner disconnected Google Calendar).
 */
export async function releaseCalendarHold({
  clerkUserId,
  eventId,
}: {
  clerkUserId: string;
  eventId: string;
}): Promise<
  | { success: true }
  | { success: false; error: string; retryable: boolean }
> {
  const oAuthClient = await getOAuthClient(clerkUserId);
  if (!oAuthClient) {
    return {
      success: false as const,
      error: "Google Calendar not connected",
      retryable: false,
    };
  }

  try {
    await google.calendar("v3").events.delete({
      calendarId: "primary",
      eventId,
      auth: oAuthClient,
      sendUpdates: "all",
    });
    return { success: true as const };
  } catch (error) {
    console.error("[releaseCalendarHold]", error);
    if (is_not_found_error(error)) {
      // Already gone — the slot is free, which is the outcome we wanted.
      return { success: true as const };
    }
    return {
      success: false as const,
      error: "Failed to release calendar hold",
      retryable: true,
    };
  }
}

export const getOAuthClient = async (clerkUserId: string) => {
  try {
    const clerk = await clerkClient();
    const token = await clerk.users.getUserOauthAccessToken(
      clerkUserId,
      "oauth_google"
    );

    if (token.data.length === 0 || token.data[0].token == null) {
      return;
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URL
    );

    client.setCredentials({ access_token: token.data[0].token });
    return client;
  } catch (e) {
    console.log(e);
  }
};
