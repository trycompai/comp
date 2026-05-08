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
import { UnsubscribeLink } from '../components/unsubscribe-link';
import { getUnsubscribeUrl } from '../lib/unsubscribe';

export interface PolicyAcknowledgmentDigestPolicy {
  id: string;
  name: string;
  url: string;
}

export interface PolicyAcknowledgmentDigestOrg {
  id: string;
  name: string;
  policies: PolicyAcknowledgmentDigestPolicy[];
}

export interface PolicyAcknowledgmentDigestEmailProps {
  email: string;
  userName: string;
  orgs: PolicyAcknowledgmentDigestOrg[];
}

const pluralizePolicies = (count: number) =>
  count === 1 ? '1 policy' : `${count} policies`;

/**
 * Shared subject-line builder so the trigger task and the email Preview
 * header stay in sync.
 */
export const computePolicyAcknowledgmentDigestSubject = (
  orgs: PolicyAcknowledgmentDigestOrg[],
): string => {
  const totalPolicies = orgs.reduce((sum, o) => sum + o.policies.length, 0);
  const [firstOrg] = orgs;
  if (orgs.length === 1 && firstOrg) {
    return `You have ${pluralizePolicies(totalPolicies)} to review at ${firstOrg.name}`;
  }
  return `You have ${pluralizePolicies(totalPolicies)} to review across ${orgs.length} organizations`;
};

export const PolicyAcknowledgmentDigestEmail = ({
  email,
  userName,
  orgs,
}: PolicyAcknowledgmentDigestEmailProps) => {
  const orgsWithPolicies = orgs.filter((o) => o.policies.length > 0);
  const [firstOrg] = orgsWithPolicies;
  if (!firstOrg) return null;

  const portalBase = (
    process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.trycomp.ai'
  ).replace(/\/+$/, '');
  const subjectText = computePolicyAcknowledgmentDigestSubject(orgsWithPolicies);
  const isMultiOrg = orgsWithPolicies.length > 1;

  return (
    <Html>
      <Tailwind>
        <head />
        <Preview>{subjectText}</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              {subjectText}
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hi {userName || 'there'},
            </Text>

            {isMultiOrg ? (
              <Text className="text-[14px] leading-[24px] text-[#121212]">
                The following organizations have policies awaiting your review
                and acknowledgment:
              </Text>
            ) : (
              <Text className="text-[14px] leading-[24px] text-[#121212]">
                Your organization{' '}
                <strong>{firstOrg.name}</strong> has{' '}
                {pluralizePolicies(firstOrg.policies.length)} awaiting
                your review and acknowledgment:
              </Text>
            )}

            {orgsWithPolicies.map((org) => {
              const orgPortalLink = `${portalBase}/${org.id}`;
              return (
                <Section key={org.id} className="mt-[16px] mb-[24px]">
                  {isMultiOrg && (
                    <Text className="m-0 mb-[8px] text-[14px] font-semibold leading-[24px] text-[#121212]">
                      {org.name}
                    </Text>
                  )}
                  {org.policies.map((policy) => (
                    <Text
                      key={policy.id}
                      className="m-0 text-[14px] leading-[24px] text-[#121212]"
                    >
                      &bull;{' '}
                      <Link
                        href={policy.url}
                        className="text-[#121212] underline"
                      >
                        {policy.name}
                      </Link>
                    </Text>
                  ))}
                  <Section className="mt-[16px] mb-[16px] text-center">
                    <Button
                      className="border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] no-underline"
                      href={orgPortalLink}
                    >
                      {isMultiOrg ? `Review in ${org.name}` : 'Review in portal'}
                    </Button>
                  </Section>
                </Section>
              );
            })}

            <br />
            <Section>
              <Text className="text-[12px] leading-[24px] text-[#666666]">
                This notification was intended for{' '}
                <span className="text-[#121212]">{email}</span>.
              </Text>
            </Section>

            <UnsubscribeLink
              email={email}
              unsubscribeUrl={getUnsubscribeUrl(email)}
            />

            <br />

            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PolicyAcknowledgmentDigestEmail;
