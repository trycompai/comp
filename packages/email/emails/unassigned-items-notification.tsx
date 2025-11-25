import {
  Body,
  Container,
  Font,
  Heading,
  Html,
  Link,
  Section,
  Preview,
  Tailwind,
  Text,
} from '@react-email/components';
import { Footer } from '../components/footer';
import { Logo } from '../components/logo';
import { UnsubscribeLink } from '../components/unsubscribe-link';
import { getUnsubscribeUrl } from '../lib/unsubscribe';

interface UnassignedItem {
  type: 'task' | 'policy' | 'risk' | 'vendor';
  id: string;
  name: string;
}

interface Props {
  userName: string;
  organizationName: string;
  organizationId: string;
  removedMemberName: string;
  unassignedItems: UnassignedItem[];
  email?: string;
}

export const UnassignedItemsNotificationEmail = ({
  userName,
  organizationName,
  organizationId,
  removedMemberName,
  unassignedItems,
  email,
}: Props) => {
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'https://app.trycomp.ai';
  const link = `${baseUrl}/${organizationId}`;


  const getItemTypeLabel = (type: UnassignedItem['type']) => {
    switch (type) {
      case 'task':
        return 'Task';
      case 'policy':
        return 'Policy';
      case 'risk':
        return 'Risk';
      case 'vendor':
        return 'Vendor';
    }
  };

  const getItemUrl = (item: UnassignedItem) => {
    switch (item.type) {
      case 'task':
        return `${baseUrl}/${organizationId}/tasks/${item.id}`;
      case 'policy':
        return `${baseUrl}/${organizationId}/policies/${item.id}`;
      case 'risk':
        return `${baseUrl}/${organizationId}/risk/${item.id}`;
      case 'vendor':
        return `${baseUrl}/${organizationId}/vendors/${item.id}`;
    }
  };

  const groupedItems = unassignedItems.reduce(
    (acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    },
    {} as Record<UnassignedItem['type'], UnassignedItem[]>,
  );

  return (
    <Html>
      <Tailwind>
        <head>
          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: 'https://app.trycomp.ai/fonts/geist/geist-sans-latin-400-normal.woff2',
              format: 'woff2',
            }}
            fontWeight={400}
            fontStyle="normal"
          />

          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: 'https://app.trycomp.ai/fonts/geist/geist-sans-latin-500-normal.woff2',
              format: 'woff2',
            }}
            fontWeight={500}
            fontStyle="normal"
          />
        </head>

        <Preview>Member removed - items require reassignment</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              Member Removed - Items Require Reassignment
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hi {userName},
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              <strong>{removedMemberName}</strong> has been removed from <strong>{organizationName}</strong>.
              As a result, the following items that were previously assigned to them now require a new assignee:
            </Text>

            {Object.entries(groupedItems).map(([type, items]) => (
              <Section key={type} className="my-[12px]">
                <Text className="text-[16px] font-medium text-[#121212] mb-[8px] mt-0">
                  {getItemTypeLabel(type as UnassignedItem['type'])}s ({items.length})
                </Text>
                <ul className="list-disc pl-[12px]">
                  {items.map((item) => (
                    <li key={item.id} className="text-[14px] leading-[24px] text-[#121212]">
                      <Link href={getItemUrl(item)} className="text-[#121212] underline">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            ))}

            <Text className="text-[14px] leading-[24px] text-[#121212] mt-[24px]">
              Please log in to assign these items to appropriate team members.
            </Text>

            <Section className="mt-[32px] mb-[42px] text-center">
              <a
                href={link}
                className="text-primary border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] no-underline inline-block"
              >
                View Organization
              </a>
            </Section>

            {email && <UnsubscribeLink email={email} unsubscribeUrl={getUnsubscribeUrl(email)} />}

            <br />

            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default UnassignedItemsNotificationEmail;

