import {
  Body,
  Button,
  Container,
  Font,
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

interface Props {
  email: string;
  userName: string;
  policyName: string;
  organizationName: string;
  organizationId: string;
  notificationType: 'new' | 'updated' | 're-acceptance';
}

export const PolicyNotificationEmail = ({
  email,
  userName,
  policyName,
  organizationName,
  organizationId,
  notificationType,
}: Props) => {
  const link = `${process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.trycomp.ai'}/${organizationId}`;
  const subjectText = 'Please review and accept this policy';

  const getBodyText = () => {
    switch (notificationType) {
      case 'new':
        return `The "${policyName}" policy has been created.`;
      case 'updated':
      case 're-acceptance':
        return `The "${policyName}" policy has been updated.`;
      default:
        return `Please review and accept the policy "${policyName}".`;
    }
  };

  return (
    <Html>
      <Tailwind>
        <head>
          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: 'https://app.trycomp.ai/fonts/geist/geist-sans-latin-400-normal.woff2',
              format: 'woff2',
            }}
            fontWeight={400}
            fontStyle="normal"
          />

          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: 'https://app.trycomp.ai/fonts/geist/geist-sans-latin-500-normal.woff2',
              format: 'woff2',
            }}
            fontWeight={500}
            fontStyle="normal"
          />
        </head>

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
              Hi {userName},
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              {getBodyText()}
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Your organization <strong>{organizationName}</strong> requires all employees to review and accept this policy.
            </Text>

            <Section className="mt-[32px] mb-[42px] text-center">
              <Button
                className="text-primary border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] no-underline"
                href={link}
              >
                Review & Accept Policy
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] break-all text-[#707070]">
              or copy and paste this URL into your browser{' '}
              <Link href={link} className="text-[#707070] underline">
                {link}
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

export default PolicyNotificationEmail;
