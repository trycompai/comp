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
  toName: string;
  organizationName: string;
  accessLink: string;
  expiresAt: Date;
}

export const AccessReclaimEmail = ({
  toName,
  organizationName,
  accessLink,
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
        <Preview>Access Your Compliance Data - {organizationName}</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Access Your Data
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hello {toName},
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              You requested access to <strong>{organizationName}</strong>'s
              compliance documentation.
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Click the button below to access your data:
            </Text>

            <Section className="mt-[32px] mb-[42px] text-center">
              <Button
                className="text-primary border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] no-underline"
                href={accessLink}
              >
                Access Compliance Data
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] break-all text-[#707070]">
              or copy and paste this URL into your browser{' '}
              <Link href={accessLink} className="text-[#707070] underline">
                {accessLink}
              </Link>
            </Text>

            <br />
            <Section>
              <Text className="text-[12px] leading-[24px] text-[#666666]">
                This link will expire in 24 hours. Your grant expires on:{' '}
                <strong>
                  {expiresAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </strong>
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

export default AccessReclaimEmail;
