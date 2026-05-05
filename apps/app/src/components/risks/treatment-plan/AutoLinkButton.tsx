'use client';

import { Button, Stack, Text } from '@trycompai/design-system';
import { Link as LinkIcon } from '@trycompai/design-system/icons';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AutoLinkButtonProps {
  /** Whether the entity already has a saved treatment-plan description. */
  hasDescription: boolean;
  disabled?: boolean;
  onAutoLink: () => Promise<{ runId: string; publicAccessToken: string }>;
  onAfterLink?: () => Promise<void>;
}

type RunState =
  | { kind: 'idle' }
  | { kind: 'running'; runId: string; publicAccessToken: string };

const PHASE_LABEL: Record<string, string> = {
  starting: 'Starting…',
  'embedding-tasks': 'Embedding tasks',
  'embedding-risks': 'Embedding risks',
  'embedding-vendors': 'Embedding vendors',
  'waiting-for-index': 'Waiting for the index',
  'matching-risks': 'Matching tasks to risks',
  'matching-vendors': 'Matching tasks to vendors',
  done: 'Finishing up…',
};

export function AutoLinkButton({
  hasDescription,
  disabled,
  onAutoLink,
  onAfterLink,
}: AutoLinkButtonProps) {
  const [state, setState] = useState<RunState>({ kind: 'idle' });
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async () => {
    setSubmitting(true);
    try {
      const { runId, publicAccessToken } = await onAutoLink();
      setState({ kind: 'running', runId, publicAccessToken });
    } catch {
      toast.error('Auto-link failed. Try again or link manually.');
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === 'running') {
    return (
      <RunProgress
        runId={state.runId}
        accessToken={state.publicAccessToken}
        hasDescription={hasDescription}
        onComplete={async (linked) => {
          if (linked === 0) {
            toast.info('No matching tasks found. Link manually from the Tasks tab.');
          } else {
            toast.success(
              `Linked ${linked} task${linked === 1 ? '' : 's'}${
                hasDescription ? ' · refreshing treatment plan' : ' · generating treatment plan'
              }`,
            );
            // Post-link refresh (mitigation regen, swr revalidation) is
            // separate from the link itself succeeding. If it fails we
            // surface a distinct toast so the user knows the link landed
            // but the plan refresh did not. Without this branch a
            // refresh failure could either be silent or — worse — get
            // mistaken for a link failure. (Cubic finding #23.)
            if (onAfterLink) {
              try {
                await onAfterLink();
              } catch (err) {
                console.error('[AutoLinkButton] post-link refresh failed', err);
                toast.warning(
                  'Linked the tasks, but refreshing the treatment plan failed. Try regenerating manually.',
                );
              }
            }
          }
          setState({ kind: 'idle' });
        }}
        onFailed={() => {
          toast.error('Auto-link failed. Try again or link manually.');
          setState({ kind: 'idle' });
        }}
      />
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || submitting}
      loading={submitting}
      iconLeft={<LinkIcon aria-hidden="true" />}
    >
      {hasDescription ? 'Auto-link tasks & refresh plan' : 'Auto-link tasks & generate plan'}
    </Button>
  );
}

interface RunProgressProps {
  runId: string;
  accessToken: string;
  hasDescription: boolean;
  onComplete: (linked: number) => void;
  onFailed: () => void;
}

function RunProgress({ runId, accessToken, onComplete, onFailed }: RunProgressProps) {
  const { run } = useRealtimeRun(runId, { accessToken, enabled: true });

  const meta = (run?.metadata ?? {}) as Record<string, unknown>;
  const phase = typeof meta.phase === 'string' ? meta.phase : 'starting';
  const current = typeof meta.current === 'number' ? meta.current : null;
  const total = typeof meta.total === 'number' ? meta.total : null;

  const status = run?.status;
  useEffect(() => {
    if (!status) return;
    if (status === 'COMPLETED') {
      const riskLinks = typeof meta.riskLinks === 'number' ? meta.riskLinks : 0;
      const vendorLinks = typeof meta.vendorLinks === 'number' ? meta.vendorLinks : 0;
      onComplete(riskLinks + vendorLinks);
      return;
    }
    if (
      status === 'FAILED' ||
      status === 'CANCELED' ||
      status === 'CRASHED' ||
      status === 'SYSTEM_FAILURE' ||
      status === 'EXPIRED' ||
      status === 'TIMED_OUT'
    ) {
      onFailed();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show progress phases (skip 'done' — onComplete handles transition).
  const showProgress = phase !== 'done' && phase in PHASE_LABEL;
  const label = showProgress ? PHASE_LABEL[phase] : PHASE_LABEL.starting;
  const countSuffix =
    current !== null && total !== null && total > 0 && phase !== 'starting' && phase !== 'done'
      ? ` (${current}/${total})`
      : '';

  return (
    <div
      className="rounded-md border border-border bg-muted/30 p-3"
      role="status"
      aria-live="polite"
    >
      <Stack gap="xs">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
            aria-hidden="true"
          />
          <Text size="xs" weight="medium">
            Auto-linking tasks
          </Text>
        </div>
        <Text size="xs" variant="muted">
          {label}
          {countSuffix}
        </Text>
      </Stack>
    </div>
  );
}
