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
  domain: string;
  settingsUrl: string;
}

export const TrustDomainMisconfiguredEmail = ({
  toName,
  organizationName,
  domain,
  settingsUrl,
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
        <Preview>
          Action required: Trust Portal custom domain {domain} is misconfigured
        </Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Trust Portal Domain Needs Attention
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hello {toName},
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              We detected that the custom domain{' '}
              <strong>{domain}</strong> configured for{' '}
              <strong>{organizationName}</strong>'s Trust Portal is no longer
              resolving correctly. Visitors using this domain may be unable to
              access your Trust Portal until the DNS configuration is fixed.
            </Text>

            <Section
              className="mt-[24px] mb-[24px] rounded-[3px] border-l-4 p-[15px]"
              style={{ backgroundColor: '#fff8f0', borderColor: '#f97316' }}
            >
              <Text className="m-0 text-[14px] leading-[24px] text-[#121212]">
                <strong>What to do:</strong>
                <br />
                Visit your Trust Portal settings to review the DNS records and
                re-verify your domain. Ensure your CNAME record points to the
                correct target and that all required verification records are in
                place.
              </Text>
            </Section>

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded-[3px] bg-[#121212] px-[20px] py-[12px] text-center text-[14px] font-semibold text-white no-underline"
                href={settingsUrl}
              >
                Review Domain Settings
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              If you need help, please contact our support team.
            </Text>

            <br />

            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default TrustDomainMisconfiguredEmail;
