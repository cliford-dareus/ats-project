import {
    Body,
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

interface InformationRequestProps {
    candidateName: string;
    jobTitle: string;
    body: string;
    companyName?: string;
    companyLogoUrl?: string;
    senderName?: string;
    senderTitle?: string;
}

export const InformationRequestTemplate = ({
    candidateName,
    jobTitle,
    body,
    companyName = "Acme Corp",
    companyLogoUrl = "https://via.placeholder.com/160x50/111827/ffffff?text=LOGO",
    senderName = "Sarah Chen",
    senderTitle = "Talent Acquisition Lead",
}: InformationRequestProps) => {
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

                        {body == "" ?
                            <Text className="text-zinc-700 text-[17px] leading-relaxed mb-6">
                                {"{{"}Thank you for applying to the <strong className="text-zinc-900">{jobTitle}</strong>{" "}
                                position at {companyName}. We truly appreciate the time you took to submit your application.{"}}"}
                            </Text> : <Text className="text-zinc-700 text-[17px] leading-relaxed mb-6">{body}</Text>}

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

export default InformationRequestTemplate;
