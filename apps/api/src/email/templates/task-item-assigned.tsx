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
import { getUnsubscribeUrl } from '@comp/email';

interface Props {
  toName: string;
  toEmail: string;
  taskTitle: string;
  assignedByName: string;
  organizationName: string;
  taskUrl: string;
}

export const TaskItemAssignedEmail = ({
  toName,
  toEmail,
  taskTitle,
  assignedByName,
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
        <Preview>You were assigned to a task: {taskTitle}</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Task Assigned to You
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hello {toName},
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              <strong>{assignedByName}</strong> assigned you to the task{' '}
              <strong>"{taskTitle}"</strong> in <strong>{organizationName}</strong>.
            </Text>

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded-[3px] bg-[#121212] px-[20px] py-[12px] text-center text-[14px] font-semibold text-white no-underline"
                href={taskUrl}
              >
                View Task
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

export default TaskItemAssignedEmail;

