import {
  Body,
  Container,
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
  organizationName: string;
  oldEmail: string;
  newEmail: string;
}

export const LoginEmailChangedEmail = ({ organizationName, oldEmail, newEmail }: Props) => {
  return (
    <Html>
      <Tailwind>
        <head />
        <Preview>Your Comp AI login email was changed</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Your login email was changed
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              An administrator of <span className="font-medium">{organizationName}</span>{' '}
              changed your Comp AI login email from{' '}
              <span className="font-medium">{oldEmail}</span> to{' '}
              <span className="font-medium">{newEmail}</span>.
            </Text>
            <Text className="text-[14px] leading-[24px] text-[#121212]">
              From now on, use <span className="font-medium">{newEmail}</span> to
              sign in.
            </Text>

            <br />
            <Section>
              <Text className="text-[12px] leading-[24px] text-[#666666]">
                If you did not expect this change, contact your organization
                administrator or support@trycomp.ai.
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

export default LoginEmailChangedEmail;
