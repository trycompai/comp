'use client';

import { useAdminTimelineTemplate } from '@/hooks/use-admin-timelines';
import {
  PageHeader,
  PageHeaderDescription,
  PageLayout,
  Section,
  Text,
} from '@trycompai/design-system';
import { ArrowLeft } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { TimelinePhaseBar } from '@/app/(app)/[orgId]/overview/components/TimelinePhaseBar';
import { TemplateMetadataForm } from './TemplateMetadataForm';
import { PhaseList } from './PhaseList';

interface TemplateEditorPageProps {
  orgId: string;
  templateId: string;
}

export function TemplateEditorPage({
  orgId,
  templateId,
}: TemplateEditorPageProps) {
  const { template, isLoading, error, mutate } =
    useAdminTimelineTemplate(templateId);

  const phasesForBar =
    template?.phases
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((p) => ({
        id: p.id,
        name: p.name,
        groupLabel: p.groupLabel,
        status: 'PENDING' as const,
        durationWeeks: p.defaultDurationWeeks,
        orderIndex: p.orderIndex,
      })) ?? [];

  const totalWeeks = phasesForBar.reduce(
    (sum, p) => sum + p.durationWeeks,
    0,
  );

  if (isLoading) {
    return (
      <PageLayout header={<PageHeader title="Loading..." />}>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading template...
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout header={<PageHeader title="Error" />}>
        <div className="flex flex-col items-center gap-4 py-12">
          <Text variant="muted">
            Failed to load template:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </Text>
          <Link
            href={`/${orgId}/admin/timeline-templates`}
            className="text-sm text-primary underline"
          >
            Back to templates
          </Link>
        </div>
      </PageLayout>
    );
  }

  if (!template) {
    return (
      <PageLayout header={<PageHeader title="Not Found" />}>
        <div className="flex flex-col items-center gap-4 py-12">
          <Text variant="muted">Template not found.</Text>
          <Link
            href={`/${orgId}/admin/timeline-templates`}
            className="text-sm text-primary underline"
          >
            Back to templates
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header={
        <PageHeader
          title={template.name}
          actions={
            <Link
              href={`/${orgId}/admin/timeline-templates`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={16} />
              Back to templates
            </Link>
          }
        >
          <PageHeaderDescription>
            {template.framework?.name ?? 'Unknown Framework'} &middot; Cycle{' '}
            {template.cycleNumber} &middot; {totalWeeks} weeks total
          </PageHeaderDescription>
        </PageHeader>
      }
    >
      <Section>
        <TemplateMetadataForm template={template} onMutate={mutate} />
      </Section>

      {phasesForBar.length > 0 && (
        <Section>
          <Text size="sm" weight="semibold">
            Preview
          </Text>
          <div className="mt-2">
            <TimelinePhaseBar phases={phasesForBar} height={32} />
          </div>
        </Section>
      )}

      <PhaseList
        phases={template.phases}
        templateId={template.id}
        onMutate={mutate}
      />
    </PageLayout>
  );
}
