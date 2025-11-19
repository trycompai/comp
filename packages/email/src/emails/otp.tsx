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

interface Props {
  email: string;
  otp: string;
}

export const OTPVerificationEmail = ({ email, otp }: Props) => {
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

        <Preview>One-Time Password for Comp AI</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Your one-time password for Comp AI
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hey there,
              <br />
              <br />
              Your one-time password for Comp AI is: {otp}. Please do not share this code with
              anyone.
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              If you did not request this password, you can safely ignore this email. For support,
              please reach out to your IT / Security department.
            </Text>

            <br />
            <Section>
              <Text className="text-[12px] leading-[24px] text-[#666666]">
                This one time password was intended for{' '}
                <span className="text-[#121212]">{email}</span> and expires in 10 minutes.
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
