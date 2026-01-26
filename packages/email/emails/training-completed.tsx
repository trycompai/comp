import {
  Body,
  Container,
  Font,
  Heading,
  Html,
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
  organizationName: string;
  completedAt: Date;
}

export const TrainingCompletedEmail = ({
  email,
  userName,
  organizationName,
  completedAt,
}: Props) => {
  const formattedDate = new Date(completedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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

        <Preview>Congratulations! You've completed your Security Awareness Training</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Training Complete!
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">Hi {userName},</Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Congratulations! You have successfully completed all Security Awareness Training
              modules for <strong>{organizationName}</strong>.
            </Text>

            <Section
              className="mt-[24px] mb-[24px] rounded-[8px] p-[24px] text-center"
              style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <Text className="m-0 text-[16px] font-medium text-[#166534]">
                Completion Date: {formattedDate}
              </Text>
            </Section>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Your training completion certificate is attached to this email. Please save it for
              your records.
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Thank you for your commitment to maintaining security awareness and helping protect{' '}
              {organizationName}.
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

export default TrainingCompletedEmail;
