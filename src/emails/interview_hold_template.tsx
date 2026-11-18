import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import * as React from "react";

interface InterviewHoldProps {
    candidateName: string;
    jobTitle: string;
    /** Pre-formatted interview date/time, e.g. "Friday, November 20, 2026 · 2:00 PM – 2:30 PM UTC" */
    interviewDateTime: string;
    /** Pre-formatted hold expiry, e.g. "Wednesday, November 18, 2026, 4:00 PM UTC" */
    holdExpiresAt: string;
    confirmUrl: string;
    companyName?: string;
    senderName?: string;
    senderTitle?: string;
}

export const InterviewHoldTemplate = ({
    candidateName,
    jobTitle,
    interviewDateTime,
    holdExpiresAt,
    confirmUrl,
    companyName = "Applico",
    senderName = "Talent Acquisition",
    senderTitle = "Hiring Team",
}: InterviewHoldProps) => {
    return (
        <Html>
            <Head />
            <Preview>
                Confirm your interview for the {jobTitle} role — we&apos;re holding a slot for you.
            </Preview>

            <Tailwind>
                <Body className="bg-zinc-100 font-sans">
                    <Container className="bg-white mx-auto max-w-[600px] rounded-xl shadow-sm my-8 p-8">
                        <Heading className="text-3xl font-bold text-zinc-900 text-center mb-6">
                            We&apos;re holding an interview slot for you
                        </Heading>

                        <Text className="text-xl text-zinc-800 mb-6">Hi {candidateName},</Text>

                        <Text className="text-zinc-700 text-[17px] leading-relaxed mb-6">
                            We&apos;d like to interview you for the{" "}
                            <strong className="text-zinc-900">{jobTitle}</strong> position.
                            We&apos;ve tentatively held the following time on the interviewer&apos;s
                            calendar:
                        </Text>

                        <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 my-6 text-center">
                            <Text className="text-zinc-900 text-[17px] font-semibold m-0">
                                {interviewDateTime}
                            </Text>
                        </Section>

                        <Text className="text-zinc-700 text-[17px] leading-relaxed mb-8">
                            Please confirm by{" "}
                            <strong className="text-zinc-900">{holdExpiresAt}</strong> — after
                            that the hold expires and the slot is released. If this time
                            doesn&apos;t work, you can decline from the same page and we&apos;ll
                            find another time.
                        </Text>

                        {/* CTA Button */}
                        <Section className="text-center my-8">
                            <Button
                                href={confirmUrl}
                                className="bg-zinc-900 hover:bg-zinc-800 transition-colors text-white text-[17px] font-semibold px-8 py-4 rounded-lg text-center no-underline inline-block"
                            >
                                Confirm interview
                            </Button>
                        </Section>

                        <Text className="text-zinc-500 text-sm leading-relaxed mb-6">
                            Button not working? Copy and paste this link into your browser:
                            <br />
                            <Link href={confirmUrl} className="text-zinc-700 underline break-all">
                                {confirmUrl}
                            </Link>
                        </Text>

                        <Hr className="border-zinc-200 my-8" />

                        <Text className="text-zinc-700 text-[17px] leading-relaxed mb-6">
                            If you have any questions or need to reschedule, feel free to reply to this email.
                        </Text>

                        <Text className="text-zinc-800 font-semibold text-lg mb-1">
                            We look forward to speaking with you soon!
                        </Text>

                        <Text className="text-zinc-600">
                            Best regards,
                            <br />
                            {senderName}
                            <br />
                            {senderTitle}
                            <br />
                            {companyName}
                        </Text>

                        <Hr className="border-zinc-200 my-8" />

                        {/* Footer */}
                        <Text className="text-center text-zinc-500 text-sm">
                            © {new Date().getFullYear()} {companyName}. All rights reserved.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default InterviewHoldTemplate;
