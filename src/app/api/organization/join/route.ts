import {db} from "@/drizzle/db";
import {NextRequest, NextResponse} from "next/server";
import {auth} from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const role = searchParams.get('role');
    const {userId} = await auth();

    console.log(userId, orgId);

    if (!userId || !orgId) {
        console.error("orgId is missing from the query parameters.");
        return NextResponse.json({error: "orgId is required"}, {status: 400});
    };

    const response = await fetch(`https://api.clerk.dev/v1/organizations/${orgId}/memberships`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            role: role || 'org:member'
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        return NextResponse.json({error: error}, {status: 400});
    };

    return NextResponse.json({message: "Success"});
};
