'use client';

import { downloadAutomationPDF } from '@/lib/evidence-download';
import { EvidenceAutomation, EvidenceAutomationRun } from '@db';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowRight,
  Download,
  Plus,
} from 'lucide-react';
import type React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, HStack, Section, Stack, Text } from '@trycompai/design-system';
import { useTaskAutomations } from '../hooks/use-task-automations';

type AutomationWithLatestRun = EvidenceAutomation & {
  runs: EvidenceAutomationRun[];
};

interface TaskAutomationsProps {
  automations: AutomationWithLatestRun[];
  isManualTask?: boolean;
}

export const TaskAutomations = ({ automations, isManualTask = false }: TaskAutomationsProps) => {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const router = useRouter();
  const { mutate: mutateAutomations } = useTaskAutomations();

  const handleCreateAutomation = () => {
    if (isManualTask) return;
    router.push(`/${orgId}/tasks/${taskId}/automation/new`);
  };

  if (isManualTask && automations.length === 0) {
    return null;
  }

  if (automations.length === 0) {
    return (
      <Section title="Custom Automations" description="Build AI-powered automations for this task">
        <Button variant="outline" size="lg" iconLeft={<Plus />} onClick={handleCreateAutomation}>
          Create Automation
        </Button>
      </Section>
    );
  }

  return (
    <Section title="Custom Automations" description="AI-powered evidence collection">
      <Stack gap="sm">
        {automations.map((automation) => {
          const latestVersionRun = automation.runs.find((run) => run.version !== null);
          const lastRan = latestVersionRun?.createdAt
            ? formatDistanceToNow(new Date(latestVersionRun.createdAt), { addSuffix: true })
            : null;
          const isPassing = latestVersionRun &&
            latestVersionRun.status === 'completed' &&
            latestVersionRun.evaluationStatus !== 'fail';
          const isFailing = latestVersionRun &&
            (latestVersionRun.status === 'failed' || latestVersionRun.evaluationStatus === 'fail');

          const borderColor = isFailing
            ? 'border-destructive/50 bg-destructive/5'
            : isPassing
              ? 'border-primary/50 bg-primary/5'
              : 'border-border';
          const dotColor = isFailing
            ? 'bg-destructive'
            : isPassing
              ? 'bg-primary'
              : 'bg-muted-foreground';

          return (
            <Link
              key={automation.id}
              href={`/${orgId}/tasks/${taskId}/automations/${automation.id}/overview`}
              className={`group flex items-center gap-3 rounded-lg border transition-colors py-2.5 px-4 ${borderColor}`}
            >
              <div className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />

              <Stack gap="none" as="div" style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" weight="medium">{automation.name}</Text>
                <Text size="xs" variant="muted">
                  {latestVersionRun && lastRan
                    ? `Last ran ${lastRan} • v${latestVersionRun.version}`
                    : 'No published runs yet'}
                </Text>
              </Stack>

              {latestVersionRun && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await downloadAutomationPDF({
                        taskId,
                        automationId: automation.id,
                        automationName: automation.name,
                      });
                      toast.success('Evidence PDF downloaded');
                    } catch {
                      toast.error('Failed to download evidence');
                    }
                  }}
                  title="Download evidence PDF"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}

              <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          );
        })}

        {!isManualTask && (
          <Button variant="outline" size="lg" onClick={handleCreateAutomation}>
            <Plus className="w-4 h-4 mr-2" />
            Create Automation
          </Button>
        )}
      </Stack>
    </Section>
  );
};
