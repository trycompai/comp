'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
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
        {templates.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No timeline templates yet. Create one to get started.
          </div>
        ) : (
          <Table variant="bordered">
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Framework</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Phases</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
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
