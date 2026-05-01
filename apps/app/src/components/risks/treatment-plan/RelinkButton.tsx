'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Renew } from '@trycompai/design-system/icons';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface RelinkButtonProps {
  disabled?: boolean;
  /** Triggers the relink and returns realtime handle. */
  onRelink: () => Promise<{ runId: string; publicAccessToken: string }>;
  /** Called after the run completes with non-zero links — typically chains regen. */
  onAfterLink?: () => Promise<void>;
}

type RunState =
  | { kind: 'idle' }
  | { kind: 'running'; runId: string; publicAccessToken: string };

// Duplicated from AutoLinkButton (~50 lines) — small enough to keep inline.
const PHASE_LABEL: Record<string, string> = {
  starting: 'Starting…',
  'embedding-tasks': 'Embedding tasks',
  'embedding-risks': 'Embedding risks',
  'embedding-vendors': 'Embedding vendors',
  'matching-risks': 'Matching tasks to risks',
  'matching-vendors': 'Matching tasks to vendors',
  done: 'Finishing up…',
};

export function RelinkButton({ disabled, onRelink, onAfterLink }: RelinkButtonProps) {
  const [state, setState] = useState<RunState>({ kind: 'idle' });
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const { runId, publicAccessToken } = await onRelink();
      setState({ kind: 'running', runId, publicAccessToken });
    } catch {
      toast.error('Re-link failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === 'running') {
    return (
      <RunProgress
        runId={state.runId}
        accessToken={state.publicAccessToken}
        onComplete={async (linked) => {
          if (linked === 0) {
            toast.info('No matching tasks found after re-link.');
          } else {
            toast.success(
              `Re-linked ${linked} task${linked === 1 ? '' : 's'} · refreshing treatment plan`,
            );
            if (onAfterLink) {
              try {
                await onAfterLink();
              } catch {
                // outer handler surfaces errors; we just reset state.
              }
            }
          }
          setState({ kind: 'idle' });
        }}
        onFailed={() => {
          toast.error('Re-link failed. Try again.');
          setState({ kind: 'idle' });
        }}
      />
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={disabled || submitting}
        render={
          <Button
            variant="ghost"
            size="sm"
            loading={submitting}
            iconLeft={<Renew aria-hidden="true" />}
          >
            Re-link from scratch
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Re-link tasks from scratch?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every currently linked task and rebuilds the linkage by matching
            the most relevant tasks. Any manual unlinks you've made will be reverted.
            The treatment plan will refresh after.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Yes, re-link</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface RunProgressProps {
  runId: string;
  accessToken: string;
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
            Re-linking tasks
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
