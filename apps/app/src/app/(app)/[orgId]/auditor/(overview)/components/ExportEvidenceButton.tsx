'use client';

import { triggerBulkEvidenceExport } from '@/lib/evidence-download';
import {
  Button,
  HStack,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Switch,
  Text,
} from '@trycompai/design-system';
import { ArrowDown } from '@trycompai/design-system/icons';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface ExportEvidenceButtonProps {
  organizationName: string;
}

type ExportState =
  | { phase: 'idle' }
  | { phase: 'triggering' }
  | { phase: 'running'; runId: string; accessToken: string };

export function ExportEvidenceButton({
  organizationName,
}: ExportEvidenceButtonProps) {
  const [includeJson, setIncludeJson] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({
    phase: 'idle',
  });

  const isRunning =
    exportState.phase === 'triggering' || exportState.phase === 'running';

  const handleTrigger = async () => {
    setExportState({ phase: 'triggering' });
    try {
      const { runId, publicAccessToken } = await triggerBulkEvidenceExport({
        includeJson,
      });
      setExportState({ phase: 'running', runId, accessToken: publicAccessToken });
    } catch (err) {
      toast.error('Failed to start evidence export. Please try again.');
      console.error('Evidence export trigger error:', err);
      setExportState({ phase: 'idle' });
    }
  };

  const handleComplete = useCallback(
    (run: { output?: { downloadUrl?: string } | null; metadata?: Record<string, unknown> }) => {
      const downloadUrl =
        run.output?.downloadUrl ??
        (run.metadata?.downloadUrl as string | undefined);

      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${organizationName || 'evidence'}-export.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Evidence package downloaded successfully');
      } else {
        toast.error('Export completed but download link was not available.');
      }

      setExportState({ phase: 'idle' });
      setIsOpen(false);
    },
    [organizationName],
  );

  const handleError = useCallback(() => {
    toast.error('Evidence export failed. Please try again.');
    setExportState({ phase: 'idle' });
  }, []);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Export All Evidence</Button>

      <Sheet open={isOpen} onOpenChange={(open) => {
        if (!isRunning) setIsOpen(open);
      }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Export All Evidence</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <Stack gap="lg">
              {exportState.phase === 'running' ? (
                <ExportProgress
                  runId={exportState.runId}
                  accessToken={exportState.accessToken}
                  onComplete={handleComplete}
                  onError={handleError}
                />
              ) : (
                <>
                  <Text size="sm" variant="muted">
                    Download every task&apos;s uploaded evidence as a single ZIP
                    so you can hand it to your auditor or keep an offline
                    snapshot.
                  </Text>

                  <HStack justify="between" align="center">
                    <Stack gap="none">
                      <Text size="sm" weight="medium">
                        Include raw JSON files
                      </Text>
                      <Text size="xs" variant="muted">
                        Adds machine-readable metadata alongside the evidence
                        files.
                      </Text>
                    </Stack>
                    <Switch
                      checked={includeJson}
                      onCheckedChange={setIncludeJson}
                    />
                  </HStack>

                  <HStack justify="end">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      iconLeft={<ArrowDown size={16} />}
                      onClick={handleTrigger}
                      disabled={exportState.phase === 'triggering'}
                      loading={exportState.phase === 'triggering'}
                    >
                      Export
                    </Button>
                  </HStack>
                </>
              )}
            </Stack>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ExportProgress({
  runId,
  accessToken,
  onComplete,
  onError,
}: {
  runId: string;
  accessToken: string;
  onComplete: (run: { output?: { downloadUrl?: string } | null; metadata?: Record<string, unknown> }) => void;
  onError: () => void;
}) {
  const { run } = useRealtimeRun(runId, {
    accessToken,
    enabled: true,
    onComplete: (run) => onComplete(run),
    onError: () => onError(),
  });

  const meta = run?.metadata as
    | {
        status?: string;
        progress?: number;
        tasksCompleted?: number;
        tasksTotal?: number;
      }
    | undefined;

  const progress = meta?.progress ?? 0;
  const status = meta?.status ?? 'starting';
  const tasksCompleted = meta?.tasksCompleted ?? 0;
  const tasksTotal = meta?.tasksTotal ?? 0;

  const statusLabel =
    status === 'starting'
      ? 'Starting export...'
      : status === 'generating'
        ? `Processing task ${tasksCompleted} of ${tasksTotal}...`
        : status === 'generating-link'
          ? 'Generating download link...'
          : 'Preparing...';

  return (
    <Stack gap="md">
      <Text size="sm" weight="medium">
        {statusLabel}
      </Text>
      <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 3 }}>
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#3b82f6',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <Text size="xs" variant="muted">
        This may take a few minutes for large organizations. You can close this
        dialog — the export will continue in the background.
      </Text>
    </Stack>
  );
}
