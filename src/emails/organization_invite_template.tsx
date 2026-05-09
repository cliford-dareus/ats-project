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
    Tailwind,
    Text,
} from '@react-email/components';

interface OrganizationInviteEmailProps {
    inviteeUsername: string;
    inviterUsername: string;
    inviterEmail: string;
    department: string;
    organizationId: string;
    organizationName: string;
};

const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : '';

export const VercelInviteUserEmail = ({
    inviteeUsername,
    inviterEmail,
    organizationName,
    organizationId,
    department,
    inviterUsername
}: OrganizationInviteEmailProps) => {
    const previewText = `Join ${inviterUsername} on ${organizationName}`;

    return (
        <Html>
            <Head />
            <Tailwind>
                <Body className="mx-auto my-auto bg-white px-2 font-sans">
                    <Preview>{previewText}</Preview>
                    <Container
                        className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
                        <Section className="mt-[32px]">
                            <Img
                                src={`${baseUrl}/static/vercel-logo.png`}
                                width="40"
                                height="37"
                                alt="Vercel Logo"
                                className="mx-auto my-0"
                            />
                        </Section>
                        <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
                            Join <strong>{department}</strong> on <strong>TinyATS</strong>
                        </Heading>
                        <Text className="text-[14px] text-black leading-[24px]">
                            Hello {inviteeUsername},
                        </Text>
                        <Text className="text-[14px] text-black leading-[24px]">
                            <strong>{inviterUsername}</strong> (
                            <Link
                                href={`mailto:${inviterEmail}`}
                                className="text-blue-600 no-underline"
                            >
                                {inviterEmail}
                            </Link>
                            ) has invited you to the <strong>{department}</strong> team on{' '}
                            <strong>TinyATS</strong>.
                        </Text>

                        {/*<Section>*/}
                        {/*    <Row>*/}
                        {/*        <Column align="right">*/}
                        {/*            <Img*/}
                        {/*                className="rounded-full"*/}
                        {/*                src={userImage}*/}
                        {/*                width="64"*/}
                        {/*                height="64"*/}
                        {/*                alt={`${username}'s profile picture`}*/}
                        {/*            />*/}
                        {/*        </Column>*/}
                        {/*        <Column align="center">*/}
                        {/*            <Img*/}
                        {/*                src={`${baseUrl}/static/vercel-arrow.png`}*/}
                        {/*                width="12"*/}
                        {/*                height="9"*/}
                        {/*                alt="Arrow indicating invitation"*/}
                        {/*            />*/}
                        {/*        </Column>*/}
                        {/*        <Column align="left">*/}
                        {/*            <Img*/}
                        {/*                className="rounded-full"*/}
                        {/*                src={teamImage}*/}
                        {/*                width="64"*/}
                        {/*                height="64"*/}
                        {/*                alt={`${teamName} team logo`}*/}
                        {/*            />*/}
                        {/*        </Column>*/}
                        {/*    </Row>*/}
                        {/*</Section>*/}

                        <Text className="text-[14px] text-black leading-[24px]">
                            Copy and paste this into your onboarding process:{' '}
                            <span className="text-blue-600 no-underline text-3xl">
                                {organizationId}
                            </span>
                            <Button
                                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                            >
                                Copy the code
                            </Button>
                        </Text>

                        <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

                        <Text className="text-[#666666] text-[12px] leading-[24px]">
                            This invitation was intended for{' '}
                            <span className="text-black">{inviteeUsername}</span>. This invite was
                            sent from <span className="text-black">inviteFromIp</span>{' '}
                            located in{' '}
                            <span className="text-black">inviteFromLocation</span>. If you
                            were not expecting this invitation, you can ignore this email. If
                            you are concerned about your account' safety, please reply to
                            this email to get in touch with us.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

VercelInviteUserEmail.PreviewProps = {
    inviteeUsername: "",
    inviterUsername: "Cliford",
    inviterEmail: "",
    department: "",
    organizationId: "org_64729233783673263",
    organizationName: "",
} as OrganizationInviteEmailProps;

export default VercelInviteUserEmail;
