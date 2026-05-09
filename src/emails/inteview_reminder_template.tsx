import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import * as React from "react";

interface InterviewReminderProps {
    candidateName: string;
    jobTitle: string;
    interviewTime: string;        // e.g. "Tomorrow, May 15th at 2:00 PM EST"
    interviewerName: string;
    zoomLink?: string;
    officeAddress?: string;
    rescheduleLink: string;
    companyName?: string;
    companyLogoUrl?: string;
    senderName?: string;
}

export const InterviewReminder = ({
    candidateName,
    jobTitle,
    interviewTime,
    interviewerName,
    zoomLink,
    officeAddress,
    rescheduleLink,
    companyName = "Acme Corp",
    companyLogoUrl = "https://via.placeholder.com/160x50/111827/ffffff?text=LOGO",
    senderName = "Sarah Chen",
}: InterviewReminderProps) => {
    return (
        <Html>
            <Head />
            <Preview>
                Reminder: Your interview for {jobTitle} is tomorrow at {interviewTime}
            </Preview>

            <Tailwind>
                <Body className="bg-zinc-100 font-sans">
                    <Container className="bg-white mx-auto max-w-[600px] rounded-xl shadow-sm my-8 p-8">
                        {/* Logo */}
                        <Section className="text-center mb-8">
                            <Img
                                src={companyLogoUrl}
                                width="160"
                                height="50"
                                alt={companyName}
                                className="mx-auto"
                            />
                        </Section>

                        <Heading className="text-3xl font-bold text-zinc-900 text-center mb-6">
                            Interview Reminder ⏰
                        </Heading>

                        <Text className="text-xl text-zinc-800 mb-6">Hi {candidateName},</Text>

                        <Text className="text-zinc-700 text-[17px] leading-relaxed mb-6">
                            This is a friendly reminder that your interview for the{" "}
                            <strong className="text-zinc-900">{jobTitle}</strong> position is coming up soon.
                        </Text>

                        <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 mb-8">
                            <Text className="text-zinc-900 font-semibold mb-2">📅 Interview Details</Text>
                            <Text className="text-zinc-700 text-[17px]">
                                <strong>Time:</strong> {interviewTime}
                                <br />
                                <strong>Interviewer:</strong> {interviewerName}
                            </Text>

                            {zoomLink && (
                                <Text className="mt-4">
                                    <Link
                                        href={zoomLink}
                                        className="text-blue-600 font-medium underline"
                                    >
                                        🔗 Join Zoom Meeting
                                    </Link>
                                </Text>
                            )}

                            {officeAddress && (
                                <Text className="mt-3 text-zinc-700">
                                    📍 <strong>Location:</strong> {officeAddress}
                                </Text>
                            )}
                        </Section>

                        {/* Main CTA */}
                        <Section className="text-center my-8">
                            <Button
                                href={zoomLink || "#"}
                                className="bg-blue-600 hover:bg-blue-700 transition-colors text-white text-[17px] font-semibold px-8 py-4 rounded-lg inline-block"
                            >
                                Join the Interview
                            </Button>
                        </Section>

                        <Section className="text-center mb-8">
                            <Button
                                href={rescheduleLink}
                                className="bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-[16px] font-medium px-6 py-3 rounded-lg inline-block"
                            >
                                Reschedule if Needed
                            </Button>
                        </Section>

                        <Text className="text-zinc-700 text-[17px] leading-relaxed mb-6">
                            Please make sure to join a few minutes early. If you're joining via Zoom, we
                            recommend testing your camera and microphone beforehand.
                        </Text>

                        <Hr className="border-zinc-200 my-8" />

                        <Text className="text-zinc-700 text-[17px] leading-relaxed">
                            If anything comes up or you need to reschedule, just click the button above or
                            reply to this email. We're happy to accommodate.
                        </Text>

                        <Text className="text-zinc-800 font-semibold mt-8 mb-1">
                            Looking forward to speaking with you!
                        </Text>

                        <Text className="text-zinc-600">
                            Best regards,
                            <br />
                            {senderName}
                            <br />
                            Talent Acquisition
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

export default InterviewReminder;
