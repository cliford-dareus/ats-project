import { Resend } from "resend";

interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    from?: string;
};

export const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html, from = 'onboarding@resend.dev' }: EmailPayload) => {
    try {
        // 2. Send via Resend
        const data = await resend.emails.send({
            from: from,
            to: [to],
            subject: subject,
            html: html,
        });

        return { success: true, data };
    } catch (error) {
        console.error("Email Error:", error);
        return { success: false, error };
    }
};
