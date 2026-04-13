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

  const visibleCount = templates.filter(
    (template) => template.framework?.visible === true,
  ).length;

  const filteredTemplates = templates.filter((template) => {
    if (visibilityFilter === 'all') return true;
    if (visibilityFilter === 'visible') {
      return template.framework?.visible === true;
    }
    return template.framework?.visible !== true;
  });

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
            All ({templates.length})
          </Button>
          <Button
            size="sm"
            variant={visibilityFilter === 'visible' ? 'default' : 'outline'}
            onClick={() => setVisibilityFilter('visible')}
          >
            Visible ({visibleCount})
          </Button>
          <Button
            size="sm"
            variant={visibilityFilter === 'hidden' ? 'default' : 'outline'}
            onClick={() => setVisibilityFilter('hidden')}
          >
            Hidden ({templates.length - visibleCount})
          </Button>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {templates.length === 0
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
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Text size="sm" weight="medium">
                      {template.name}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text size="sm" variant="muted">
                      {template.framework?.name ?? 'Unknown'}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        template.framework?.visible === true
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {template.framework?.visible === true
                        ? 'Visible'
                        : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Cycle {template.cycleNumber}</Badge>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">{template.phases.length}</Text>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">
                      {totalDurationWeeks(template)} weeks
                    </Text>
                  </TableCell>
                  <TableCell>
                    <div className="w-48">
                      <TimelinePhaseBar
                        phases={phasesForBar(template)}
                        height={20}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      iconLeft={<Edit size={16} />}
                      onClick={() => handleEdit(template)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
