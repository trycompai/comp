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
  toName: string;
  organizationName: string;
  scopes: string[];
  expiresAt: Date;
}

export const AccessGrantedEmail = ({
  toName,
  organizationName,
  scopes,
  expiresAt,
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
              Your NDA has been signed and your access to <strong>{organizationName}</strong>'s
              compliance documentation is now active.
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              <strong>You now have access to:</strong>
            </Text>

            <ul className="text-[14px] leading-[24px] text-[#121212]">
              {scopes.map((scope) => (
                <li key={scope}>{scope}</li>
              ))}
            </ul>

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

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              You can download your signed NDA for your records from the link provided on the
              confirmation page.
            </Text>

            <Section
              className="mt-[30px] mb-[20px] rounded-[3px] border-l-4 p-[15px]"
              style={{ backgroundColor: '#f8f9fa', borderColor: '#121212' }}
            >
              <Text className="m-0 text-[14px] leading-[24px] text-[#121212]">
                <strong>Need to access your data again?</strong>
                <br />
                Visit the trust portal and click "Already have access?" to receive a new access
                link.
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
