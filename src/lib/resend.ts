import { Resend } from "resend";
// import OrganizationInviteTemplate from "@/components/emails/organization_invite_template";

export const resend = new Resend(process.env.RESEND_API_KEY);

// const send = async () => {
//     try{
//         await resend.emails.send({
//             from: 'onboarding@resend.dev',
//             to: 'cliforddareus@hotmail.com',
//             replyTo: 'you@example.com',
//             subject: 'hello world',
//             react: OrganizationInviteTemplate()
//         });
//     }catch (e) {
//         return {error: e};
//     };
// };