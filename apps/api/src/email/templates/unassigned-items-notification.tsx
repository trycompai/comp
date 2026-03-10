import {
  Body,
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
import { getUnsubscribeUrl } from '@trycompai/email';
import { Footer } from '../components/footer';
import { Logo } from '../components/logo';

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

const ITEM_TYPE_LABELS: Record<UnassignedItem['type'], string> = {
  task: 'Task',
  policy: 'Policy',
  risk: 'Risk',
  vendor: 'Vendor',
};

function getItemUrl(baseUrl: string, organizationId: string, item: UnassignedItem): string {
  const paths: Record<UnassignedItem['type'], string> = {
    task: 'tasks',
    policy: 'policies',
    risk: 'risk',
    vendor: 'vendors',
  };
  return `${baseUrl}/${organizationId}/${paths[item.type]}/${item.id}`;
}

export const UnassignedItemsNotificationEmail = ({
  userName,
  organizationName,
  organizationId,
  removedMemberName,
  unassignedItems,
  email,
}: Props) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.BETTER_AUTH_URL
    ?? 'https://app.trycomp.ai';
  const link = `${baseUrl}/${organizationId}`;

  const groupedItems = unassignedItems.reduce(
    (acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
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

            <Text className="text-[14px] leading-[24px] text-[#121212]">Hi {userName},</Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              <strong>{removedMemberName}</strong> has been removed from{' '}
              <strong>{organizationName}</strong>. As a result, the following items that were
              previously assigned to them now require a new assignee:
            </Text>

            {Object.entries(groupedItems).map(([type, items]) => (
              <Section key={type} className="my-[12px]">
                <Text className="text-[16px] font-medium text-[#121212] mb-[8px] mt-0">
                  {ITEM_TYPE_LABELS[type as UnassignedItem['type']]}s ({items.length})
                </Text>
                <ul className="list-disc pl-[12px]">
                  {items.map((item) => (
                    <li key={item.id} className="text-[14px] leading-[24px] text-[#121212]">
                      <Link
                        href={getItemUrl(baseUrl, organizationId, item)}
                        className="text-[#121212] underline"
                      >
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

            {email && (
              <Section>
                <Text className="text-[12px] leading-[24px] text-[#666666]">
                  <Link href={getUnsubscribeUrl(email)} className="text-[#121212] underline">
                    Unsubscribe
                  </Link>
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
