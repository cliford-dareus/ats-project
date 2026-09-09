"use server";

import { google } from "googleapis";
import { clerkClient } from "@clerk/nextjs/server";
import { endOfDay, startOfDay } from "date-fns";

export async function getCalendarEventTimes(
  userId: string,
  { start, end }: { start: Date; end: Date }
): Promise<{ start: Date; end: Date }[]> {
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
          start: startOfDay(new Date(event.start.date)),
          end: endOfDay(new Date(event.end.date)),
        };
      }

      if (event.start?.dateTime != null && event.end?.dateTime != null) {
        return {
          start: new Date(event.start.dateTime),
          end: new Date(event.end.dateTime),
        };
      }
    })
    .filter((event) => event != null) as { start: Date; end: Date }[];
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
    attendees: [{ email: attendeeEmail }],
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

/** Promote a tentative hold to a confirmed interview event. */
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
}) {
  const oAuthClient = await getOAuthClient(clerkUserId);
  if (!oAuthClient) {
    return { success: false as const, error: "Google Calendar not connected" };
  }

  try {
    const calendarEvent = await google.calendar("v3").events.patch({
      calendarId: "primary",
      eventId,
      auth: oAuthClient,
      sendUpdates: "all",
      requestBody: {
        summary: payload.summary,
        description: payload.description,
        status: "confirmed",
        transparency: "opaque",
        attendees: [{ email: payload.candidateEmail }],
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
    return { success: false as const, error: "Failed to confirm calendar hold" };
  }
}

/** Release / cancel a hold so the slot is free again. */
export async function releaseCalendarHold({
  clerkUserId,
  eventId,
}: {
  clerkUserId: string;
  eventId: string;
}) {
  const oAuthClient = await getOAuthClient(clerkUserId);
  if (!oAuthClient) {
    return { success: false as const, error: "Google Calendar not connected" };
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
    return { success: false as const, error: "Failed to release calendar hold" };
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
