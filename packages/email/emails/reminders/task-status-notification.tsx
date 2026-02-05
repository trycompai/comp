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
import { Footer } from '../../components/footer';
import { Logo } from '../../components/logo';
import { UnsubscribeLink } from '../../components/unsubscribe-link';
import { getUnsubscribeUrl } from '../../lib/unsubscribe';

interface Props {
  email: string;
  userName: string;
  taskName: string;
  taskStatus: 'failed' | 'todo';
  organizationName: string;
  taskUrl: string;
}

export const TaskStatusNotificationEmail = ({
  email,
  userName,
  taskName,
  taskStatus,
  organizationName,
  taskUrl,
}: Props) => {
  const statusLabel = taskStatus === 'failed' ? 'Failed' : 'Needs Review';
  const statusMessage =
    taskStatus === 'failed'
      ? 'Your task has failed its automated checks and requires your attention.'
      : 'Your task is past its review date and needs to be reviewed.';

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

        <Preview>
          Task &quot;{taskName}&quot; {statusLabel} - {organizationName}
        </Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Task {statusLabel}
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">Hello {userName},</Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              The task <strong>&quot;{taskName}&quot;</strong> in{' '}
              <strong>{organizationName}</strong> requires your attention.
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">{statusMessage}</Text>

            <Section className="mt-[32px] mb-[42px] text-center">
              <Button
                className="text-primary border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] no-underline"
                href={taskUrl}
              >
                View Task
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] break-all text-[#707070]">
              or copy and paste this URL into your browser{' '}
              <Link href={taskUrl} className="text-[#707070] underline">
                {taskUrl}
              </Link>
            </Text>

            <br />
            <Section>
              <Text className="text-[12px] leading-[24px] text-[#666666]">
                this notification was intended for <span className="text-[#121212]">{email}</span>
                .{' '}
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

export default TaskStatusNotificationEmail;
