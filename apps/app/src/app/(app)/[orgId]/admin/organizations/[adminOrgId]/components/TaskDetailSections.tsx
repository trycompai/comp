'use client';

import {
  Badge,
  Button,
  Stack,
  Text,
} from '@trycompai/design-system';
import {
  Attachment,
  Chat,
  CheckmarkFilled,
  CloseFilled,
  Download,
  Integration,
  Pending,
} from '@trycompai/design-system/icons';
import type {
  TaskAttachment,
  AutomationRun,
  IntegrationRun,
  Comment,
} from './TaskDetailSheet';
import { formatDate, formatLabel, extractTextFromTipTap } from './TaskDetailSheet';

function SectionHeading({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
      {icon}
      <span>
        {label} ({count})
      </span>
    </div>
  );
}

export function AttachmentsSection({ attachments }: { attachments: TaskAttachment[] }) {
  return (
    <Stack gap="sm">
      <SectionHeading
        icon={<Attachment size={16} />}
        label="Attachments"
        count={attachments.length}
      />
      {attachments.length === 0 ? (
        <Text size="sm" variant="muted">No files uploaded.</Text>
      ) : (
        <Stack gap="xs">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Attachment size={14} className="shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{att.name}</span>
                <Badge variant="outline">{att.type}</Badge>
              </div>
              <a href={att.downloadUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" iconLeft={<Download size={14} />}>
                  Download
                </Button>
              </a>
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function RunStatusIcon({ status, success }: { status: string; success: boolean | null }) {
  if (status === 'completed' && success) {
    return <CheckmarkFilled size={16} className="text-green-600 dark:text-green-400" />;
  }
  if (status === 'failed' || (status === 'completed' && success === false)) {
    return <CloseFilled size={16} className="text-red-600 dark:text-red-400" />;
  }
  return <Pending size={16} className="text-muted-foreground" />;
}

export function AutomationRunsSection({ runs }: { runs: AutomationRun[] }) {
  return (
    <Stack gap="sm">
      <SectionHeading
        icon={<Pending size={16} />}
        label="Evidence Automation Runs"
        count={runs.length}
      />
      {runs.length === 0 ? (
        <Text size="sm" variant="muted">No automation runs.</Text>
      ) : (
        <Stack gap="xs">
          {runs.map((run) => (
            <div key={run.id} className="rounded-md border px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RunStatusIcon status={run.status} success={run.success} />
                  <span className="text-sm font-medium">
                    {run.evidenceAutomation.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(run.createdAt)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={run.status === 'completed' ? 'default' : 'outline'}>
                  {formatLabel(run.status)}
                </Badge>
                {run.evaluationStatus && (
                  <Badge
                    variant={run.evaluationStatus === 'pass' ? 'default' : 'destructive'}
                  >
                    {formatLabel(run.evaluationStatus)}
                  </Badge>
                )}
                <Badge variant="outline">{formatLabel(run.triggeredBy)}</Badge>
                {run.runDuration != null && (
                  <span className="text-xs text-muted-foreground">
                    {(run.runDuration / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              {run.evaluationReason && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {run.evaluationReason}
                </p>
              )}
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function IntRunStatusIcon({ status }: { status: string }) {
  if (status === 'success') {
    return <CheckmarkFilled size={16} className="text-green-600 dark:text-green-400" />;
  }
  if (status === 'failed') {
    return <CloseFilled size={16} className="text-red-600 dark:text-red-400" />;
  }
  return <Pending size={16} className="text-muted-foreground" />;
}

export function IntegrationRunsSection({ runs }: { runs: IntegrationRun[] }) {
  return (
    <Stack gap="sm">
      <SectionHeading
        icon={<Integration size={16} />}
        label="Integration Check Runs"
        count={runs.length}
      />
      {runs.length === 0 ? (
        <Text size="sm" variant="muted">No integration check runs.</Text>
      ) : (
        <Stack gap="xs">
          {runs.map((run) => (
            <div key={run.id} className="rounded-md border px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IntRunStatusIcon status={run.status} />
                  <span className="text-sm font-medium">{run.checkName}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(run.createdAt)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {run.connection?.provider && (
                  <Badge variant="outline">{run.connection.provider.name}</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {run.passedCount}/{run.totalChecked} passed
                </span>
                {run.failedCount > 0 && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {run.failedCount} failed
                  </span>
                )}
              </div>
              {run.errorMessage && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {run.errorMessage}
                </p>
              )}
              {run.results.length > 0 && (
                <div className="mt-2 space-y-1">
                  {run.results.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-start gap-2 text-xs">
                      {r.passed ? (
                        <CheckmarkFilled
                          size={14}
                          className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                        />
                      ) : (
                        <CloseFilled
                          size={14}
                          className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="font-medium">{r.title}</span>
                        {r.description && (
                          <span className="text-muted-foreground">
                            {' '}&mdash; {r.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {run.results.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{run.results.length - 5} more results
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function CommentsSection({ comments }: { comments: Comment[] }) {
  return (
    <Stack gap="sm">
      <SectionHeading
        icon={<Chat size={16} />}
        label="Comments"
        count={comments.length}
      />
      {comments.length === 0 ? (
        <Text size="sm" variant="muted">No comments yet.</Text>
      ) : (
        <Stack gap="sm">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md border px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{comment.author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {extractTextFromTipTap(comment.content)}
              </p>
              {comment.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {comment.attachments.map((a) => (
                    <Badge key={a.id} variant="outline">{a.name}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
