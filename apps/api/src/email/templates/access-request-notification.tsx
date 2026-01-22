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
  organizationName: string;
  requesterName: string;
  requesterEmail: string;
  requesterCompany?: string | null;
  requesterJobTitle?: string | null;
  purpose?: string | null;
  requestedDurationDays?: number | null;
  reviewUrl: string;
}

export const AccessRequestNotificationEmail = ({
  organizationName,
  requesterName,
  requesterEmail,
  requesterCompany,
  requesterJobTitle,
  purpose,
  requestedDurationDays,
  reviewUrl,
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
        <Preview>New Trust Portal Access Request from {requesterName}</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              New Access Request
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              A new request to access <strong>{organizationName}</strong>'s
              trust portal has been submitted and is awaiting your review.
            </Text>

            <Section
              className="mt-[20px] mb-[20px] rounded-[3px] p-[15px]"
              style={{ backgroundColor: '#f8f9fa' }}
            >
              <Text className="m-0 mb-[10px] text-[14px] font-semibold text-[#121212]">
                Requester Details
              </Text>
              <Text className="m-0 text-[14px] leading-[20px] text-[#121212]">
                <strong>Name:</strong> {requesterName}
                <br />
                <strong>Email:</strong> {requesterEmail}
                {requesterCompany && (
                  <>
                    <br />
                    <strong>Company:</strong> {requesterCompany}
                  </>
                )}
                {requesterJobTitle && (
                  <>
                    <br />
                    <strong>Job Title:</strong> {requesterJobTitle}
                  </>
                )}
              </Text>
            </Section>

            {purpose && (
              <Section className="mb-[20px]">
                <Text className="m-0 mb-[8px] text-[14px] font-semibold text-[#121212]">
                  Purpose
                </Text>
                <Text className="m-0 text-[14px] leading-[20px] text-[#121212]">
                  {purpose}
                </Text>
              </Section>
            )}

            {requestedDurationDays && (
              <Text className="text-[14px] leading-[24px] text-[#121212]">
                <strong>Requested Access Duration:</strong>{' '}
                {requestedDurationDays} days
              </Text>
            )}

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded-[3px] bg-[#121212] px-[20px] py-[12px] text-center text-[14px] font-semibold text-white no-underline"
                href={reviewUrl}
              >
                Review Request
              </Button>
            </Section>

            <Section
              className="mt-[30px] mb-[20px] rounded-[3px] border-l-4 p-[15px]"
              style={{ backgroundColor: '#fff4e6', borderColor: '#f59e0b' }}
            >
              <Text className="m-0 text-[14px] leading-[24px] text-[#121212]">
                <strong>Action Required</strong>
                <br />
                Please review this request and either approve or deny access.
                Approved requests will require the requester to sign an NDA
                before accessing your trust portal.
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

export default AccessRequestNotificationEmail;
