'use client';

import { Close } from '@trycompai/design-system/icons';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  BrowserAuthProfileStatus,
  BrowserAutomation,
  InstructionTestResult,
} from '../../hooks/types';
import { useInstructionTest } from '../../hooks/useInstructionTest';
import { FAILED_RUN_STATUSES, hostnameOf } from './connect-flow-constants';
import { InstructionComposerForm } from './InstructionComposerForm';
import { InstructionTestPanel, type TestPhase } from './InstructionTestPanel';
import type { SignInStep } from './StepList';

/** The connection a composed instruction runs under. */
export interface ConnectionRef {
  profileId: string;
  hostname: string;
  displayName: string;
  url: string;
  status: BrowserAuthProfileStatus;
}

/** Dot color for the connection chip — reflects the real profile status. */
function statusDotColor(status: BrowserAuthProfileStatus): string {
  if (status === 'verified') return 'var(--success)';
  if (status === 'needs_reauth' || status === 'blocked') return 'var(--warning)';
  return 'var(--muted-foreground)';
}

type InstructionInput = {
  name: string;
  targetUrl: string;
  instruction: string;
  evaluationCriteria?: string;
};

interface InstructionComposerProps {
  taskId: string;
  connection: ConnectionRef;
  mode: 'create' | 'edit';
  initialValues?: Pick<
    BrowserAutomation,
    'id' | 'instruction' | 'evaluationCriteria' | 'targetUrl'
  >;
  isSaving: boolean;
  onCancel: () => void;
  onCreate: (data: InstructionInput) => Promise<boolean>;
  onUpdate: (args: { automationId: string; input: InstructionInput }) => Promise<boolean>;
  onSaved: () => void;
}

/** An instruction has no separate name field; derive one from its first line. */
function deriveName(instruction: string): string {
  const firstLine = instruction.trim().split('\n')[0].trim();
  if (!firstLine) return 'Browser evidence';
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
}

/**
 * Split composer (design 1i): write the instruction on the left, watch the AI
 * attempt it live on the right, then save once it works. Schedule and starting
 * page live elsewhere — the connection supplies the default URL.
 */
export function InstructionComposer({
  taskId,
  connection,
  mode,
  initialValues,
  isSaving,
  onCancel,
  onCreate,
  onUpdate,
  onSaved,
}: InstructionComposerProps) {
  const [instruction, setInstruction] = useState(initialValues?.instruction ?? '');
  const [criteria, setCriteria] = useState(initialValues?.evaluationCriteria ?? '');

  const [phase, setPhase] = useState<TestPhase>('idle');
  const [testRun, setTestRun] = useState<{ runId: string; accessToken: string } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [steps, setSteps] = useState<SignInStep[]>([]);
  const [result, setResult] = useState<InstructionTestResult | null>(null);

  const { startTest, closeTestSession, isStarting } = useInstructionTest();

  // The AI starts from the connection and finds its own way — no manual start URL.
  const targetUrl = initialValues?.targetUrl?.trim() || connection.url;
  const host = useMemo(() => hostnameOf(targetUrl), [targetUrl]);

  const { run: runState, error: runError } = useRealtimeRun(testRun?.runId ?? '', {
    accessToken: testRun?.accessToken,
    enabled: !!testRun,
  });

  // Mirror the live activity timeline as it streams in.
  useEffect(() => {
    const streamed = runState?.metadata?.testSteps as SignInStep[] | undefined;
    if (streamed) setSteps(streamed);
  }, [runState]);

  // Resolve the test when the run finishes, and release the live session.
  useEffect(() => {
    if (!testRun) return;
    // Ignore a stale emission from a previous run before the subscription
    // catches up to the current one.
    if (runState && runState.id !== testRun.runId) return;

    const finalize = (r: InstructionTestResult) => {
      setResult(r);
      setPhase('result');
      setTestRun(null);
      setSessionId((current) => {
        if (current) void closeTestSession(current);
        return null;
      });
    };

    if (runError) {
      finalize({ success: false, error: 'The test run could not complete.' });
      return;
    }
    if (!runState) return;

    if (runState.status === 'COMPLETED') {
      finalize(
        (runState.output as InstructionTestResult) ?? {
          success: false,
          error: 'No result returned.',
        },
      );
    } else if (FAILED_RUN_STATUSES.has(runState.status)) {
      const timedOut = runState.status === 'TIMED_OUT';
      finalize({
        success: false,
        error: timedOut
          ? 'The AI ran out of time before finishing. Try a more specific instruction, or use “Advanced — start from a specific page” to begin closer to what you need.'
          : 'The test run could not complete.',
      });
    }
  }, [testRun, runState, runError, closeTestSession]);

  // Never leak the live session if the user leaves mid-test.
  useEffect(() => {
    return () => {
      if (sessionId) void closeTestSession(sessionId);
    };
  }, [sessionId, closeTestSession]);

  const handleTest = useCallback(async () => {
    if (!instruction.trim()) {
      toast.error('Add an instruction first.');
      return;
    }
    if (sessionId) void closeTestSession(sessionId);
    setSteps([]);
    setResult(null);
    setSessionId(null);
    setLiveViewUrl(null);
    setPhase('testing');

    const handle = await startTest({
      profileId: connection.profileId,
      targetUrl,
      instruction: instruction.trim(),
      evaluationCriteria: criteria.trim() ? criteria.trim() : undefined,
      taskId,
    });
    if (!handle) {
      setPhase('idle');
      return;
    }
    setSessionId(handle.sessionId);
    setLiveViewUrl(handle.liveViewUrl);
    setTestRun({ runId: handle.runId, accessToken: handle.publicAccessToken });
  }, [
    instruction,
    sessionId,
    closeTestSession,
    startTest,
    connection.profileId,
    targetUrl,
    criteria,
    taskId,
  ]);

  const handleSave = useCallback(async () => {
    if (!instruction.trim()) {
      toast.error('Add an instruction first.');
      return;
    }
    const input: InstructionInput = {
      name: deriveName(instruction),
      targetUrl,
      instruction: instruction.trim(),
      evaluationCriteria: criteria.trim() ? criteria.trim() : undefined,
    };
    const ok = initialValues?.id
      ? await onUpdate({ automationId: initialValues.id, input })
      : await onCreate(input);
    if (ok) onSaved();
  }, [instruction, targetUrl, criteria, initialValues?.id, onCreate, onUpdate, onSaved]);

  const handleCancel = useCallback(() => {
    if (sessionId) void closeTestSession(sessionId);
    onCancel();
  }, [sessionId, closeTestSession, onCancel]);

  const testing = phase === 'testing';
  const canSave = mode === 'edit' || phase === 'result';

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <div className="text-base text-foreground">
            {mode === 'edit' ? 'Edit instruction' : 'New instruction'}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tell the AI what to capture. It runs unattended on this task&apos;s schedule
            once saved.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pl-1.5 pr-2.5 text-[11.5px] text-foreground">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-muted text-[8px] font-bold uppercase">
              {connection.hostname.charAt(0)}
            </span>
            {connection.hostname}
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: statusDotColor(connection.status) }}
            />
          </span>
          <button
            onClick={handleCancel}
            aria-label="Close"
            className="grid h-6 w-6 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
          >
            <Close size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-[430px] flex-col md:flex-row">
        <InstructionComposerForm
          instruction={instruction}
          onInstructionChange={setInstruction}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          testing={testing}
          canSave={canSave}
          hasResult={!!result}
          isSaving={isSaving}
          isStarting={isStarting}
          onTest={handleTest}
          onSave={handleSave}
        />

        {/* Right test panel */}
        <div className="flex flex-1 flex-col p-6" style={{ background: 'var(--muted)' }}>
          <InstructionTestPanel
            phase={phase}
            host={host}
            liveViewUrl={liveViewUrl}
            steps={steps}
            result={result}
          />
        </div>
      </div>
    </div>
  );
}
