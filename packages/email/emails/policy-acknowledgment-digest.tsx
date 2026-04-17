import {
  Body,
  Button,
  Container,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { Footer } from '../components/footer';
import { Logo } from '../components/logo';
import { UnsubscribeLink } from '../components/unsubscribe-link';
import { getUnsubscribeUrl } from '../lib/unsubscribe';

export interface PolicyAcknowledgmentDigestEmailProps {
  email: string;
  userName: string;
  organizationName: string;
  organizationId: string;
  policies: { id: string; name: string; url: string }[];
}

export const PolicyAcknowledgmentDigestEmail = ({
  email,
  userName,
  organizationName,
  organizationId,
  policies,
}: PolicyAcknowledgmentDigestEmailProps) => {
  if (policies.length === 0) return null;

  const portalBase = (
    process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.trycomp.ai'
  ).replace(/\/+$/, '');
  const portalLink = `${portalBase}/${organizationId}`;
  const countLabel = policies.length === 1 ? '1 policy' : `${policies.length} policies`;
  const subjectText = `You have ${countLabel} to review at ${organizationName}`;

  return (
    <Html>
      <Tailwind>
        <head />
        <Preview>{subjectText}</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              {subjectText}
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hi {userName || 'there'},
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Your organization <strong>{organizationName}</strong> has {countLabel} awaiting your
              review and acknowledgment:
            </Text>

            <Section className="mt-[16px] mb-[24px]">
              {policies.map((policy) => (
                <Text key={policy.id} className="m-0 text-[14px] leading-[24px] text-[#121212]">
                  &bull;{' '}
                  <Link href={policy.url} className="text-[#121212] underline">
                    {policy.name}
                  </Link>
                </Text>
              ))}
            </Section>

            <Section className="mt-[16px] mb-[42px] text-center">
              <Button
                className="border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] no-underline"
                href={portalLink}
              >
                Review in portal
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] break-all text-[#707070]">
              or copy and paste this URL into your browser{' '}
              <Link href={portalLink} className="text-[#707070] underline">
                {portalLink}
              </Link>
            </Text>

            <br />
            <Section>
              <Text className="text-[12px] leading-[24px] text-[#666666]">
                This notification was intended for <span className="text-[#121212]">{email}</span>.
              </Text>
            </Section>

            <UnsubscribeLink email={email} unsubscribeUrl={getUnsubscribeUrl(email)} />

            <br />

            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PolicyAcknowledgmentDigestEmail;
