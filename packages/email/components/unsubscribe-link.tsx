import { Link, Section, Text } from '@react-email/components';

interface UnsubscribeLinkProps {
  email: string;
  unsubscribeUrl: string;
}

export function UnsubscribeLink({ email, unsubscribeUrl }: UnsubscribeLinkProps) {
  return (
    <Section className="mt-[24px]">
      <Text className="text-[12px] leading-[18px] text-[#999999]">
        If you no longer wish to receive these notifications, you can{' '}
        <Link href={unsubscribeUrl} className="text-[#999999] underline">
          unsubscribe here
        </Link>
        .
      </Text>
    </Section>
  );
}

