"use server"

import {google} from "googleapis";
import {clerkClient} from "@clerk/nextjs/server";
import {endOfDay, startOfDay} from "date-fns";

export async function getCalendarEventTimes(
    clerkUserId: string,
    {start, end}: { start: Date; end: Date }
) {
    const oAuthClient = await getOAuthClient(clerkUserId)
    const events = await google.calendar("v3").events.list({
        calendarId: "cliforddareus@gmail.com",
        eventTypes: ["default"],
        singleEvents: true,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        maxResults: 2500,
        auth: oAuthClient,
    })

    return (
        events.data.items
            ?.map(event => {
                if (event.start?.date != null && event.end?.date != null) {
                    return {
                        start: startOfDay(event.start.date),
                        end: endOfDay(event.end.date),
                    }
                }

                if (event.start?.dateTime != null && event.end?.dateTime != null) {
                    return {
                        start: new Date(event.start.dateTime),
                        end: new Date(event.end.dateTime),
                    }
                }
            })
            .filter(date => date != null) || []
    )
};

export const getOAuthClient = async (clerkUserId: string) => {
    const token = await (await clerkClient()).users.getUserOauthAccessToken(
        clerkUserId,
        "oauth_google"
    )

    if (token.data.length === 0 || token.data[0].token == null) {
        return
    }

    const client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URL
    )

    client.setCredentials({access_token: token.data[0].token})

    return client
};