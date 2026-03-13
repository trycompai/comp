'use client';

import { api } from '@/lib/api-client';
import {
  Badge,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Time } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState } from 'react';
import {
  AttachmentsSection,
  AutomationRunsSection,
  CommentsSection,
  IntegrationRunsSection,
} from './TaskDetailSections';

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  image: string | null;
  deactivated: boolean;
}

export interface Comment {
  id: string;
  content: string;
  author: CommentAuthor;
  attachments: { id: string; name: string; type: string }[];
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  downloadUrl: string;
  createdAt: string;
}

export interface AutomationRun {
  id: string;
  status: string;
  success: boolean | null;
  evaluationStatus: string | null;
  evaluationReason: string | null;
  triggeredBy: string;
  createdAt: string;
  completedAt: string | null;
  runDuration: number | null;
  evidenceAutomation: { name: string };
}

export interface IntegrationCheckResult {
  id: string;
  passed: boolean;
  title: string;
  description: string | null;
  severity: string | null;
  resourceType: string;
}

export interface IntegrationRun {
  id: string;
  checkName: string;
  status: string;
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  results: IntegrationCheckResult[];
  connection: {
    provider: { name: string; slug: string } | null;
  };
}

interface TaskDetails {
  id: string;
  title: string;
  description: string;
  status: string;
  department: string | null;
  frequency: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; user: { name: string; email: string } } | null;
  approver: { id: string; user: { name: string } } | null;
  approvedAt: string | null;
  controls: { id: string; name: string }[];
  comments: Comment[];
  attachments: TaskAttachment[];
  automationRuns: AutomationRun[];
  integrationRuns: IntegrationRun[];
}

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  todo: 'outline',
  in_progress: 'secondary',
  done: 'default',
  not_applicable: 'destructive',
};

export function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TipTapNode {
  type: string;
  text?: string;
  content?: TipTapNode[];
}

function extractNodeText(node: TipTapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  const parts = node.content.map(extractNodeText);
  if (node.type === 'doc' || node.type === 'bulletList' || node.type === 'orderedList') {
    return parts.join('\n');
  }
  if (node.type === 'paragraph' || node.type === 'listItem' || node.type === 'heading') {
    return parts.join('') + '\n';
  }
  return parts.join('');
}

export function extractTextFromTipTap(content: string): string {
  try {
    const doc: TipTapNode = JSON.parse(content);
    return extractNodeText(doc).trim();
  } catch {
    return content;
  }
}

export function TaskDetailSheet({
  taskId,
  orgId,
  onClose,
}: {
  taskId: string | null;
  orgId: string;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const res = await api.get<TaskDetails>(
      `/v1/admin/organizations/${orgId}/tasks/${taskId}/details`,
    );
    if (res.data) setDetails(res.data);
    setLoading(false);
  }, [orgId, taskId]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setDetails(null);
    }
  };

  return (
    <Sheet open={!!taskId} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {loading ? 'Loading...' : (details?.title ?? 'Task Details')}
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading task details...
            </div>
          ) : details ? (
            <TaskContent details={details} />
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function TaskContent({ details }: { details: TaskDetails }) {
  return (
    <Stack gap="lg">
      <TaskOverview details={details} />
      <div className="border-t" />
      <AttachmentsSection attachments={details.attachments} />
      <div className="border-t" />
      <AutomationRunsSection runs={details.automationRuns} />
      <div className="border-t" />
      <IntegrationRunsSection runs={details.integrationRuns} />
      <div className="border-t" />
      <CommentsSection comments={details.comments} />
    </Stack>
  );
}

function TaskOverview({ details }: { details: TaskDetails }) {
  return (
    <Stack gap="md">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[details.status] ?? 'default'}>
          {formatLabel(details.status)}
        </Badge>
        {details.department && details.department !== 'none' && (
          <Badge variant="outline">{formatLabel(details.department)}</Badge>
        )}
        {details.frequency && (
          <Badge variant="outline">{formatLabel(details.frequency)}</Badge>
        )}
      </div>

      {details.description && (
        <Text size="sm" variant="muted">
          {details.description}
        </Text>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        {details.assignee && (
          <div>
            <span className="text-muted-foreground">Assignee: </span>
            <span className="font-medium">{details.assignee.user.name}</span>
          </div>
        )}
        {details.approver && (
          <div>
            <span className="text-muted-foreground">Approver: </span>
            <span className="font-medium">{details.approver.user.name}</span>
          </div>
        )}
        {details.controls.length > 0 && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Controls: </span>
            <span className="font-medium">
              {details.controls.map((c) => c.name).join(', ')}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Time size={12} />
        <span>Updated {formatDate(details.updatedAt)}</span>
      </div>
    </Stack>
  );
}
