import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import * as React from "react";

interface ApplicationSubmittedProps {
    candidateName: string;
    jobTitle: string;
    companyName?: string;
    companyLogoUrl?: string;
    applicationId?: string;           // Optional reference number
    expectedResponseTime?: string;    // e.g. "within 7-10 business days"
    senderName?: string;
    senderTitle?: string;
}

export const ApplicationSubmittedTemplate = ({
    candidateName,
    jobTitle,
    companyName = "Acme Corp",
    companyLogoUrl = "https://via.placeholder.com/160x50/111827/ffffff?text=LOGO",
    applicationId,
    expectedResponseTime = "within 7-10 business days",
    senderName = "Sarah Chen",
    senderTitle = "Talent Acquisition Lead",
}: ApplicationSubmittedProps) => {
    return (
        <Html>
            <Head />
            <Preview>
                Thank you for applying to the {jobTitle} position at {companyName}
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
                            Application Received ✅
                        </Heading>

                        <Text className="text-xl text-zinc-800 mb-6">Hi {candidateName},</Text>

                        <Text className="text-zinc-700 text-[17px] leading-relaxed mb-6">
                            Thank you for applying to the <strong className="text-zinc-900">{jobTitle}</strong>{" "}
                            position at {companyName}. We truly appreciate the time you took to submit your application.
                        </Text>

                        {applicationId && (
                            <Text className="text-zinc-700 text-[17px] mb-6">
                                Your application reference: <strong>#{applicationId}</strong>
                            </Text>
                        )}

                        <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 mb-8">
                            <Text className="text-zinc-900 font-semibold mb-3">What happens next?</Text>
                            <Text className="text-zinc-700 text-[17px] leading-relaxed">
                                Our team is currently reviewing all applications. We will get back to you{" "}
                                <strong>{expectedResponseTime}</strong> with an update on the status of your application.
                            </Text>
                        </Section>

                        <Text className="text-zinc-700 text-[17px] leading-relaxed mb-8">
                            In the meantime, feel free to explore more about our company, culture, and
                            other open roles on our careers page.
                        </Text>

                        <Section className="text-center my-8">
                            <Button
                                href="https://careers.example.com"
                                className="bg-zinc-800 hover:bg-black transition-colors text-white text-[17px] font-semibold px-8 py-4 rounded-lg inline-block"
                            >
                                Visit Our Careers Page
                            </Button>
                        </Section>

                        <Text className="text-zinc-700 text-[17px] leading-relaxed">
                            If you have any questions, don't hesitate to reply to this email.
                        </Text>

                        <Text className="text-zinc-800 font-semibold mt-8 mb-1">
                            Best regards,
                        </Text>

                        <Text className="text-zinc-600">
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

export default ApplicationSubmittedTemplate;
