import {
  Body,
  Button,
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
  toName: string;
  organizationName: string;
  expiresAt: Date;
  portalUrl?: string | null;
}

export const AccessGrantedEmail = ({
  toName,
  organizationName,
  expiresAt,
  portalUrl,
}: Props) => {
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
        <Preview>Access Granted - {organizationName}</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Access Granted ✓
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hello {toName},
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Your NDA has been signed and your access to{' '}
              <strong>{organizationName}</strong>'s policy documentation is now
              active.
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Your access will expire on:{' '}
              <strong>
                {expiresAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </strong>
            </Text>

            {portalUrl && (
              <Section className="mt-[32px] mb-[32px] text-center">
                <Button
                  className="rounded-[3px] bg-[#121212] px-[20px] py-[12px] text-center text-[14px] font-semibold text-white no-underline"
                  href={portalUrl}
                >
                  View Documents
                </Button>
              </Section>
            )}

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              You can download your signed NDA for your records from the
              confirmation page or by accessing the portal above.
            </Text>

            <Section
              className="mt-[30px] mb-[20px] rounded-[3px] border-l-4 p-[15px]"
              style={{ backgroundColor: '#f8f9fa', borderColor: '#121212' }}
            >
              <Text className="m-0 text-[14px] leading-[24px] text-[#121212]">
                <strong>Lost your access link?</strong>
                <br />
                Visit the trust portal and click "Already have access?" to
                receive a new access link via email.
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

export default AccessGrantedEmail;
