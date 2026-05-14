"use server";

import { Resend } from "resend";

interface SendEmailParams {
    apiKey: string;
    from: string;           // e.g. "ATS <hiring@acme.com>"
    to: string | string[];
    subject: string;
    html: string;
    replyTo?: string;
    tags?: { name: string; value: string }[];
}

export const sendEmail = async (params: SendEmailParams) => {
    const resend = new Resend(params.apiKey);
    // const resend = new Resend(process.env.RESEND_API_KEY);

    // 2. Send via Resend
    const { data, error } = await resend.emails.send({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo,
    });

    if (error) throw new Error(error.message);
    return { id: data!.id };
};
