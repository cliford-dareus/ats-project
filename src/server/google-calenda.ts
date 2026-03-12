"use server"

import {google} from "googleapis";
import {clerkClient} from "@clerk/nextjs/server";
import {addMinutes, endOfDay, startOfDay} from "date-fns";

export async function getCalendarEventTimes(
    userId: string,
    {start, end}: { start: Date; end: Date }
): Promise<{ start: Date; end: Date }[]> {
    const client = await getOAuthClient(userId);
    const events = await google.calendar("v3").events.list({
        calendarId: "primary",
        eventTypes: ["default"],
        singleEvents: true,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        maxResults: 2500,
        auth: client!,
    });

    return events.data.items
        ?.map(event => {
            if (event.start?.date != null && event.end?.date != null) {
                return {
                    start: startOfDay(new Date(event.start.date)),
                    end: endOfDay(new Date(event.end.date)),
                }
            }

            if (event.start?.dateTime != null && event.end?.dateTime != null) {
                return {
                    start: new Date(event.start.dateTime),
                    end: new Date(event.end.dateTime),
                }
            }
        })
        .filter(event => event != null) as { start: Date; end: Date }[]
};

export async function createCalendarEvent({clerkUserId, payload}) {
    const oAuthClient = await getOAuthClient(clerkUserId);
    const calendar = await clerkClient();
    const calendarUser = await calendar.users.getUser(clerkUserId);

    const { summary, description, startDateTime, endDateTime, attendeeEmail } = payload;

    if (calendarUser.primaryEmailAddress == null) {
        throw new Error("Clerk user has no email")
    };

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
        // conferenceData: {
        //     createRequest: {
        //         requestId: Math.random().toString(36).substring(7),
        //         conferenceSolutionKey: { type: "hangoutsMeet" },
        //     },
        // },
    };

    try {
        const calendarEvent = await google.calendar("v3").events.insert({
            calendarId: "primary",
            auth: oAuthClient,
            sendUpdates: "all",
            requestBody: event,
        });

        return {
            success: true,
            event: calendarEvent.data,
            // meetLink: response.data.hangoutLink
        }
    } catch (error) {
        console.error("Error creating event", error);
        res.status(500).json({ error: "Failed to create calendar event" });
    }
            // attendees: [
            //     {email: guestEmail, displayName: guestName},
            //     {
            //         email: calendarUser.primaryEmailAddress.emailAddress,
            //         displayName: calendarUser.fullName,
            //         responseStatus: "accepted",
            //     },
            // ],

}

export const getOAuthClient = async (clerkUserId: string) => {
    try {
        const clerk = await clerkClient()
        const token = await clerk.users.getUserOauthAccessToken(
            clerkUserId,
            "oauth_google"
        );

        if (token.data.length === 0 || token.data[0].token == null) {
            return
        }

        const client = new google.auth.OAuth2(
            process.env.GOOGLE_OAUTH_CLIENT_ID,
            process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            process.env.GOOGLE_OAUTH_REDIRECT_URL
        );

        client.setCredentials({access_token: token.data[0].token});
        return client;
    } catch (e) {
        console.log(e)
    }
};