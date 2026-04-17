import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminTimelineTemplate } from '@/hooks/use-admin-timelines';

interface TemplateFormValues {
  name: string;
  frameworkId: string;
  cycleNumber: number;
  phases: {
    id?: string;
    name: string;
    description?: string;
    orderIndex: number;
    defaultDurationWeeks: number;
    completionType:
      | 'AUTO_TASKS'
      | 'AUTO_POLICIES'
      | 'AUTO_PEOPLE'
      | 'AUTO_FINDINGS'
      | 'AUTO_UPLOAD'
      | 'MANUAL';
    locksTimelineOnComplete?: boolean;
  }[];
}

export function getDefaults(
  template: AdminTimelineTemplate | null,
): TemplateFormValues {
  if (!template) {
    return { name: '', frameworkId: '', cycleNumber: 1, phases: [] };
  }
  return {
    name: template.name,
    frameworkId: template.frameworkId,
    cycleNumber: template.cycleNumber,
    phases: [...template.phases]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        orderIndex: p.orderIndex,
        defaultDurationWeeks: p.defaultDurationWeeks,
        completionType: p.completionType ?? 'MANUAL',
        locksTimelineOnComplete: p.locksTimelineOnComplete ?? false,
      })),
  };
}

export async function createNewTemplate(values: TemplateFormValues) {
  const res = await api.post('/v1/admin/timeline-templates', {
    name: values.name,
    frameworkId: values.frameworkId,
    cycleNumber: values.cycleNumber,
  });
  if (res.error) throw new Error(res.error);

  const created = res.data as { id: string };
  for (const phase of values.phases) {
    const phaseRes = await api.post(
      `/v1/admin/timeline-templates/${created.id}/phases`,
      {
        name: phase.name,
        description: phase.description || undefined,
        orderIndex: phase.orderIndex,
        defaultDurationWeeks: phase.defaultDurationWeeks,
        completionType: phase.completionType,
        locksTimelineOnComplete: phase.locksTimelineOnComplete ?? false,
      },
    );
    if (phaseRes.error) throw new Error(phaseRes.error);
  }
  toast.success('Template created');
}

export async function saveExistingTemplate(
  template: AdminTimelineTemplate,
  values: TemplateFormValues,
) {
  const res = await api.patch(
    `/v1/admin/timeline-templates/${template.id}`,
    { name: values.name, cycleNumber: values.cycleNumber },
  );
  if (res.error) throw new Error(res.error);

  const existingIds = new Set(template.phases.map((p) => p.id));
  const formIds = new Set(
    values.phases.filter((p) => p.id).map((p) => p.id),
  );

  // Delete removed phases
  for (const ep of template.phases) {
    if (!formIds.has(ep.id)) {
      const delRes = await api.delete(
        `/v1/admin/timeline-templates/${template.id}/phases/${ep.id}`,
      );
      if (delRes.error) throw new Error(delRes.error);
    }
  }

  // Create or update phases
  for (const phase of values.phases) {
    if (phase.id && existingIds.has(phase.id)) {
      const patchRes = await api.patch(
        `/v1/admin/timeline-templates/${template.id}/phases/${phase.id}`,
        {
          name: phase.name,
          description: phase.description || undefined,
          orderIndex: phase.orderIndex,
          defaultDurationWeeks: phase.defaultDurationWeeks,
          completionType: phase.completionType,
          locksTimelineOnComplete: phase.locksTimelineOnComplete ?? false,
        },
      );
      if (patchRes.error) throw new Error(patchRes.error);
    } else {
      const postRes = await api.post(
        `/v1/admin/timeline-templates/${template.id}/phases`,
        {
          name: phase.name,
          description: phase.description || undefined,
          orderIndex: phase.orderIndex,
          defaultDurationWeeks: phase.defaultDurationWeeks,
          completionType: phase.completionType,
          locksTimelineOnComplete: phase.locksTimelineOnComplete ?? false,
        },
      );
      if (postRes.error) throw new Error(postRes.error);
    }
  }
  toast.success('Template updated');
}
