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
} from "@react-email/components";
import { Footer } from "../../components/footer";
import { Logo } from "../../components/logo";

interface Props {
  email: string;
  name: string;
  dueDate: string;
  recordId: string;
}

export const TaskReminderEmail = ({
  email,
  name,
  dueDate,
  recordId,
}: Props) => {
  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.trycomp.ai"}${recordId}`;

  return (
    <Html>
      <Tailwind>
        <head>
          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-400-normal.woff2",
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />

          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-500-normal.woff2",
              format: "woff2",
            }}
            fontWeight={500}
            fontStyle="normal"
          />
        </head>

        <Preview>Comp AI - Task Reminder</Preview>

        <Body className="bg-[#fff] my-auto mx-auto font-sans">
          <Container
            className="border-transparent md:border-[#E8E7E1] my-[40px] mx-auto p-[20px] max-w-[600px]"
            style={{ borderStyle: "solid", borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-[#121212] text-center">
              Task Reminder
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hey {name}, you're assigned to a task that is due soon ({dueDate}
              ).
            </Text>
            <Section className="mb-[42px] mt-[32px] text-center">
              <Button
                className="bg-transparent text-primary text-[14px] text-[#121212] font-medium no-underline text-center px-6 py-3 border border-solid border-[#121212]"
                href={link}
              >
                Open Task
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-[#707070] break-all">
              or copy and paste this URL into your browser{" "}
              <Link href={link} className="text-[#707070] underline">
                {link}
              </Link>
            </Text>

            <br />
            <Section>
              <Text className="text-[12px] leading-[24px] text-[#666666]">
                this notification was intended for{" "}
                <span className="text-[#121212] ">{email}</span>.{" "}
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

export default TaskReminderEmail;
