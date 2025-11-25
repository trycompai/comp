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
  name: string;
  dueDate: string;
  recordId: string;
}

export const TaskReminderEmail = ({ email, name, dueDate, recordId }: Props) => {
  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.trycomp.ai'}${recordId}`;

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

        <Preview>Comp AI - Task Reminder</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Task Reminder
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hey {name}, you're assigned to a task that is due soon ({dueDate}
              ).
            </Text>
            <Section className="mt-[32px] mb-[42px] text-center">
              <Button
                className="text-primary border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] no-underline"
                href={link}
              >
                Open Task
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

export default TaskReminderEmail;
