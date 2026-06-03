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

interface Props {
  organizationName: string;
  inviteLink: string;
  email?: string;
  portalLink?: string;
}

export const InviteEmail = ({ organizationName, inviteLink, email, portalLink }: Props) => {
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
        <Preview>You've been invited to join Comp AI</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Join <strong>{organizationName}</strong> on <strong>Comp AI</strong>
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              You've been invited to join your team on <strong>Comp AI</strong>.
            </Text>
            <Section className="mt-[32px] mb-[42px] text-center">
              <Button
                className="text-primary border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] no-underline"
                href={inviteLink}
              >
                Get started
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] break-all text-[#707070]">
              or copy and paste this URL into your browser{' '}
              <Link href={inviteLink} className="text-[#707070] underline">
                {inviteLink}
              </Link>
            </Text>

            {portalLink && (
              <>
                <Text className="text-[14px] leading-[24px] text-[#121212] mt-[24px]">
                  You also have access to the <strong>{organizationName} Employee Portal</strong> for
                  completing compliance tasks like signing policies and security training.
                  Once you've accepted your invite above, you can access the portal at:
                </Text>
                <Text className="text-[14px] leading-[24px] break-all text-[#707070]">
                  <Link href={portalLink} className="text-[#707070] underline">
                    {portalLink}
                  </Link>
                </Text>
              </>
            )}

            <br />
            {email && (
              <Section>
                <Text className="text-[12px] leading-[24px] text-[#666666]">
                  this invitation was intended for{' '}
                  <span className="text-[#121212]">{email}</span>.
                </Text>
              </Section>
            )}

            <br />
            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
