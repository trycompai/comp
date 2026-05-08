'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useAdminTimelineTemplates,
  type AdminTimelineTemplate,
} from '@/hooks/use-admin-timelines';
import {
  Badge,
  Button,
  PageHeader,
  PageLayout,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add, Edit } from '@trycompai/design-system/icons';
import { TimelinePhaseBar } from '@/app/(app)/[orgId]/overview/components/TimelinePhaseBar';
import { NewTemplateDialog } from './NewTemplateDialog';

interface TemplateTrackGroup {
  key: string;
  frameworkId: string;
  frameworkName: string;
  isVisible: boolean;
  displayName: string;
  templates: AdminTimelineTemplate[];
}

function groupByTrack(
  templates: AdminTimelineTemplate[],
): TemplateTrackGroup[] {
  const groups = new Map<string, TemplateTrackGroup>();

  for (const template of templates) {
    const trackKey = template.trackKey ?? 'primary';
    const key = `${template.frameworkId}:${trackKey}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        frameworkId: template.frameworkId,
        frameworkName: template.framework?.name ?? 'Unknown',
        isVisible: template.framework?.visible === true,
        displayName: template.name,
        templates: [template],
      });
      continue;
    }
    existing.templates.push(template);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      templates: [...group.templates].sort(
        (a, b) => a.cycleNumber - b.cycleNumber,
      ),
    }))
    .sort((a, b) => {
      if (a.frameworkName !== b.frameworkName) {
        return a.frameworkName.localeCompare(b.frameworkName);
      }
      return a.displayName.localeCompare(b.displayName);
    });
}

export function TemplateList() {
  const { templates, isLoading } = useAdminTimelineTemplates();
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<
    'all' | 'visible' | 'hidden'
  >('visible');

  const handleEdit = (template: AdminTimelineTemplate) => {
    router.push(`/${orgId}/admin/timeline-templates/${template.id}`);
  };

  const totalDurationWeeks = (template: AdminTimelineTemplate) =>
    template.phases.reduce((sum, p) => sum + p.defaultDurationWeeks, 0);

  const phasesForBar = (template: AdminTimelineTemplate) =>
    template.phases.map((p) => ({
      id: p.id,
      name: p.name,
      status: 'PENDING' as const,
      durationWeeks: p.defaultDurationWeeks,
      orderIndex: p.orderIndex,
    }));

  const groupedAllTemplates = groupByTrack(templates);
  const groupedVisibleTemplates = groupByTrack(
    templates.filter((template) => template.framework?.visible === true),
  );
  const groupedHiddenTemplates = groupByTrack(
    templates.filter((template) => template.framework?.visible !== true),
  );

  const filteredTemplates = templates.filter((template) => {
    if (visibilityFilter === 'all') return true;
    if (visibilityFilter === 'visible') {
      return template.framework?.visible === true;
    }
    return template.framework?.visible !== true;
  });
  const groupedFilteredTemplates = groupByTrack(filteredTemplates);
  const filteredFrameworkCount = new Set(
    groupedFilteredTemplates.map((template) => template.frameworkId),
  ).size;

  if (isLoading) {
    return (
      <PageLayout header={<PageHeader title="Timeline Templates" />}>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading templates...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header={
        <PageHeader
          title="Timeline Templates"
          actions={
            <Button
              size="sm"
              iconLeft={<Add size={16} />}
              onClick={() => setDialogOpen(true)}
            >
              New Template
            </Button>
          }
        />
      }
    >
      <Section>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Text size="sm" variant="muted">
            Filter:
          </Text>
          <Button
            size="sm"
            variant={visibilityFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setVisibilityFilter('all')}
          >
            All Templates ({groupedAllTemplates.length})
          </Button>
          <Button
            size="sm"
            variant={visibilityFilter === 'visible' ? 'default' : 'outline'}
            onClick={() => setVisibilityFilter('visible')}
          >
            Visible Templates ({groupedVisibleTemplates.length})
          </Button>
          <Button
            size="sm"
            variant={visibilityFilter === 'hidden' ? 'default' : 'outline'}
            onClick={() => setVisibilityFilter('hidden')}
          >
            Hidden Templates ({groupedHiddenTemplates.length})
          </Button>
        </div>
        <div className="mb-4">
          <Text size="sm" variant="muted">
            Showing {groupedFilteredTemplates.length} template track
            {groupedFilteredTemplates.length === 1 ? '' : 's'} across{' '}
            {filteredFrameworkCount} framework
            {filteredFrameworkCount === 1 ? '' : 's'}.
          </Text>
        </div>

        {groupedFilteredTemplates.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {groupedAllTemplates.length === 0
              ? 'No timeline templates yet. Create one to get started.'
              : 'No templates match the selected visibility filter.'}
          </div>
        ) : (
          <Table variant="bordered">
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Framework</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Phases</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedFilteredTemplates.map((group) => {
                const baseTemplate = group.templates[0];
                const phaseCounts = group.templates.map((t) => t.phases.length);
                const minPhases = Math.min(...phaseCounts);
                const maxPhases = Math.max(...phaseCounts);
                const durations = group.templates.map(totalDurationWeeks);
                const minDuration = Math.min(...durations);
                const maxDuration = Math.max(...durations);

                return (
                <TableRow key={group.key}>
                  <TableCell>
                    <Text size="sm" weight="medium">
                      {group.displayName}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text size="sm" variant="muted">
                      {group.frameworkName}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        group.isVisible
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {group.isVisible
                        ? 'Visible'
                        : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {group.templates.map((template) => (
                        <Button
                          key={template.id}
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(template)}
                        >
                          Cycle {template.cycleNumber}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">
                      {minPhases === maxPhases
                        ? minPhases
                        : `${minPhases}-${maxPhases}`}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">
                      {minDuration === maxDuration
                        ? `${minDuration} weeks`
                        : `${minDuration}-${maxDuration} weeks`}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <div className="w-48">
                      <TimelinePhaseBar
                        phases={phasesForBar(baseTemplate)}
                        height={20}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      iconLeft={<Edit size={16} />}
                      onClick={() => handleEdit(baseTemplate)}
                    >
                      {group.templates.length > 1
                        ? `Edit Cycle ${baseTemplate.cycleNumber}`
                        : 'Edit'}
                    </Button>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        )}
      </Section>

      <NewTemplateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </PageLayout>
  );
}
