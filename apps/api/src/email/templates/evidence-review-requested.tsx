import * as React from 'react';
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
import { getUnsubscribeUrl } from '@trycompai/email';

interface Props {
  toName: string;
  toEmail: string;
  taskTitle: string;
  submittedByName: string;
  organizationName: string;
  taskUrl: string;
}

export const EvidenceReviewRequestedEmail = ({
  toName,
  toEmail,
  taskTitle,
  submittedByName,
  organizationName,
  taskUrl,
}: Props) => {
  const unsubscribeUrl = getUnsubscribeUrl(toEmail);

  return (
    <Html>
      <Tailwind>
        <head>
          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            fontWeight={400}
            fontStyle="normal"
          />
          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            fontWeight={500}
            fontStyle="normal"
          />
        </head>
        <Preview>
          {`You've been requested to review evidence for "${taskTitle}"`}
        </Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Evidence Review Requested
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hello {toName},
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              <strong>{submittedByName}</strong> has submitted evidence for{' '}
              <strong>"{taskTitle}"</strong> and requested your approval in{' '}
              <strong>{organizationName}</strong>.
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Please review the evidence and approve or reject it.
            </Text>

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded-[3px] bg-[#121212] px-[20px] py-[12px] text-center text-[14px] font-semibold text-white no-underline"
                href={taskUrl}
              >
                Review Evidence
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              or copy and paste this URL into your browser:{' '}
              <a href={taskUrl} className="text-[#121212] underline">
                {taskUrl}
              </a>
            </Text>

            <Section className="mt-[30px] mb-[20px]">
              <Text className="text-[12px] leading-[20px] text-[#666666]">
                Don't want to receive task assignment notifications?{' '}
                <Link href={unsubscribeUrl} className="text-[#121212] underline">
                  Manage your email preferences
                </Link>
                .
              </Text>
            </Section>

            <br />

            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default EvidenceReviewRequestedEmail;
