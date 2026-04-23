import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Text,
} from '@trycompai/design-system';
import Link from 'next/link';

const STATEMENT_OF_APPLICABILITY_FORM = {
  type: 'statement-of-applicability',
  title: 'Statement of Applicability',
  description:
    "Auto-complete Statement of Applicability for ISO 27001. Generate answers based on your organization's policies and documentation.",
} as const;

interface SOAOverviewCardProps {
  organizationId: string;
}

export function SOAOverviewCard({
  organizationId,
}: SOAOverviewCardProps) {
  const form = STATEMENT_OF_APPLICABILITY_FORM;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Text size="lg" weight="semibold">
          {form.title}
        </Text>
        <Badge variant="secondary">1</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Link href={`/${organizationId}/documents/${form.type}`}>
          <Card>
            <CardHeader>
              <CardTitle>{form.title}</CardTitle>
              <div className="line-clamp-1">
                <CardDescription>{form.description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
