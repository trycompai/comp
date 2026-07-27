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

interface Props {
  currentEmail: string;
  newEmail: string;
  url: string;
}

export const ChangeEmailConfirmationEmail = ({ currentEmail, newEmail, url }: Props) => {
  return (
    <Html>
      <Tailwind>
        <head />
        <Preview>Confirm your email change for Comp AI</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Confirm your email change
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              You requested to change your Comp AI login email from{' '}
              <span className="font-medium">{currentEmail}</span> to{' '}
              <span className="font-medium">{newEmail}</span>. Confirm below,
              then follow the verification link we send to your new address to
              finish the change.
            </Text>
            <Section className="mt-[32px] mb-[42px] text-center">
              <Button
                className="text-primary border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] no-underline"
                href={url}
              >
                Confirm email change
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] break-all text-[#707070]">
              or copy and paste this URL into your browser{' '}
              <Link href={url} className="text-[#707070] underline">
                {url}
              </Link>
            </Text>

            <br />
            <Section>
              <Text className="text-[12px] leading-[24px] text-[#666666]">
                If you did not request this change, you can safely ignore this
                email — your login email will stay{' '}
                <span className="text-[#121212]">{currentEmail}</span>.
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

export default ChangeEmailConfirmationEmail;
