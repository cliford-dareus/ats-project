import {NextRequest, NextResponse} from "next/server";
import {resend} from "@/lib/resend";
import OrganizationInviteTemplate from "@/emails/organization_invite_template";
import {currentUser} from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser()
        const {email, orgId, orgName, subject, department} = await req.json();

        if (!email || !orgId || !orgName || !subject || !user) {
            return NextResponse.json({error: "Invalid email or subject"}, {status: 400});
        };

        const inviteeUsername = email.split("@")[0];
        // @ts-ignore
        const inviterUsername = `${user?.firstName} ${user?.lastName.charAt(0)}` ?? ""

        const {data, error} = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: subject,
            react: OrganizationInviteTemplate({
                organizationName: orgName,
                organizationId: orgId,
                department,
                inviterEmail: "onboarding@resend.dev",
                inviterUsername,
                inviteeUsername
            })
        });

        if (error) {
            return NextResponse.json({error}, {status: 403});
        };

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({error}, {status: 500});
    };
};