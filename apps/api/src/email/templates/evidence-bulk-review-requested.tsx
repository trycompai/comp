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

interface TaskItem {
  title: string;
  url: string;
}

interface Props {
  toName: string;
  toEmail: string;
  taskCount: number;
  submittedByName: string;
  organizationName: string;
  tasksUrl: string;
  tasks: TaskItem[];
}

export const EvidenceBulkReviewRequestedEmail = ({
  toName,
  toEmail,
  taskCount,
  submittedByName,
  organizationName,
  tasksUrl,
  tasks,
}: Props) => {
  const unsubscribeUrl = getUnsubscribeUrl(toEmail);
  const taskText = taskCount === 1 ? 'task' : 'tasks';

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
          {`${taskCount} ${taskText} submitted for your review`}
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
              <strong>{submittedByName}</strong> has submitted {taskCount}{' '}
              {taskText} for your review in <strong>{organizationName}</strong>.
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Please review the evidence and approve or reject each task:
            </Text>

            <Section className="mt-[16px] mb-[16px]">
              {tasks.map((task, index) => (
                <Text key={index} className="my-[4px] text-[14px] leading-[24px] text-[#121212]">
                  {'• '}
                  <Link href={task.url} className="text-[#121212] underline">
                    {task.title}
                  </Link>
                </Text>
              ))}
            </Section>

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded-[3px] bg-[#121212] px-[20px] py-[12px] text-center text-[14px] font-semibold text-white no-underline"
                href={tasksUrl}
              >
                Review Tasks
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              or copy and paste this URL into your browser:{' '}
              <a href={tasksUrl} className="text-[#121212] underline">
                {tasksUrl}
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

export default EvidenceBulkReviewRequestedEmail;
