import { Resend } from "resend";
import { render } from "@react-email/components";

interface EmailPayload {
    to: string;
    subject: string;
    template: React.ReactElement;
    from?: string;
};

export const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, template, from = 'HR Team <notifications@yourdomain.com>' }: EmailPayload) => {
    try {
        // 1. Convert React component to HTML string
        const html = await render(template);

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
