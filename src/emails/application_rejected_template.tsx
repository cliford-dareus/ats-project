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

interface RejectionEmailProps {
    candidateName: string;
    jobTitle: string;
    stage: "application" | "interview"; // Controls tone and personalization
    interviewerName?: string;           // Used for post-interview version
    companyName?: string;
    companyLogoUrl?: string;
    senderName?: string;
    senderTitle?: string;
    futureOpportunitiesLink?: string;   // Optional link to job board or talent pool
}

export const ApplicationRejectionTemplate = ({
    candidateName,
    jobTitle,
    stage,
    interviewerName,
    companyName = "Acme Corp",
    companyLogoUrl = "https://via.placeholder.com/160x50/111827/ffffff?text=LOGO",
    senderName = "Sarah Chen",
    senderTitle = "Talent Acquisition Lead",
    futureOpportunitiesLink,
}: RejectionEmailProps) => {
    const isInterviewStage = stage === "interview";

    return (
        <Html>
            <Head />
            <Preview>
                Update regarding your {jobTitle} application at {companyName}
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
                            Thank You for Applying
                        </Heading>

                        <Text className="text-xl text-zinc-800 mb-6">Hi {candidateName},</Text>

                        <Text className="text-zinc-700 text-[17px] leading-relaxed mb-6">
                            We appreciate you taking the time to apply for the{" "}
                            <strong className="text-zinc-900">{jobTitle}</strong> position.
                        </Text>

                        {isInterviewStage ? (
                            <>
                                <Text className="text-zinc-700 text-[17px] leading-relaxed mb-6">
                                    We were genuinely impressed with your experience and the conversations
                                    you had with {interviewerName || "our team"}. After careful consideration,
                                    we’ve decided to move forward with other candidates whose skills align
                                    more closely with our current needs.
                                </Text>

                                <Text className="text-zinc-700 text-[17px] leading-relaxed mb-6">
                                    This was a difficult decision, as we truly enjoyed learning about your
                                    background and perspective.
                                </Text>
                            </>
                        ) : (
                            <Text className="text-zinc-700 text-[17px] leading-relaxed mb-8">
                                After reviewing your application, we’ve decided to pursue other candidates
                                who more closely match the specific requirements for this role at this time.
                            </Text>
                        )}

                        <Text className="text-zinc-700 text-[17px] leading-relaxed mb-8">
                            We want to thank you again for your interest in joining {companyName}.
                            We truly value the time you invested in this process.
                        </Text>

                        {futureOpportunitiesLink && (
                            <Section className="text-center my-8">
                                <Button
                                    href={futureOpportunitiesLink}
                                    className="bg-zinc-800 hover:bg-black transition-colors text-white text-[17px] font-semibold px-8 py-4 rounded-lg inline-block"
                                >
                                    Explore Other Opportunities
                                </Button>
                            </Section>
                        )}

                        <Text className="text-zinc-700 text-[17px] leading-relaxed">
                            We wish you all the best in your job search and future endeavors. We’d love
                            to stay in touch and encourage you to apply again in the future if you see
                            a role that matches your profile.
                        </Text>

                        <Text className="text-zinc-800 font-semibold mt-8 mb-1">
                            Warm regards,
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
                            <br />
                            <Link href="https://example.com" className="text-zinc-500 underline">
                                Unsubscribe
                            </Link>
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default ApplicationRejectionTemplate;
