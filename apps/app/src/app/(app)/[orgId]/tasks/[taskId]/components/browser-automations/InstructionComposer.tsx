'use client';

import { Button } from '@trycompai/design-system';
import { Add, Close, Play } from '@trycompai/design-system/icons';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  BrowserAuthProfileStatus,
  BrowserAutomation,
  BrowserAutomationStepInput,
  InstructionTestResult,
} from '../../hooks/types';
import { useInstructionTest } from '../../hooks/useInstructionTest';
import { FAILED_RUN_STATUSES, hostnameOf } from './connect-flow-constants';
import { InstructionTestPanel, type TestPhase } from './InstructionTestPanel';
import { StepCard } from './StepCard';
import type { SignInStep } from './StepList';

/** The connection a composed step runs under. */
export interface ConnectionRef {
  profileId: string;
  hostname: string;
  displayName: string;
  url: string;
  status: BrowserAuthProfileStatus;
}

/** A step being edited locally (before save). */
export interface EditableStep {
  key: string;
  profileId: string;
  instruction: string;
  criteria: string;
}

type InstructionInput = {
  name: string;
  targetUrl: string;
  instruction: string;
  evaluationCriteria?: string;
  steps: BrowserAutomationStepInput[];
};

interface InstructionComposerProps {
  taskId: string;
  connection: ConnectionRef;
  connections: ConnectionRef[];
  mode: 'create' | 'edit';
  initialValues?: Pick<
    BrowserAutomation,
    'id' | 'instruction' | 'evaluationCriteria' | 'targetUrl' | 'steps'
  >;
  isSaving: boolean;
  onCancel: () => void;
  onCreate: (data: InstructionInput) => Promise<boolean>;
  onUpdate: (args: { automationId: string; input: InstructionInput }) => Promise<boolean>;
  onSaved: () => void;
  onReconnect?: (connection: ConnectionRef) => void;
}

/** An instruction has no separate name field; derive one from its first line. */
function deriveName(instruction: string): string {
  const firstLine = instruction.trim().split('\n')[0].trim();
  if (!firstLine) return 'Browser evidence';
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
}

let stepKeySeq = 0;
const newStep = (profileId: string): EditableStep => ({
  key: `step-${(stepKeySeq += 1)}`,
  profileId,
  instruction: '',
  criteria: '',
});

function initialSteps(
  initialValues: InstructionComposerProps['initialValues'],
  fallbackProfileId: string,
): EditableStep[] {
  if (initialValues?.steps && initialValues.steps.length > 0) {
    return initialValues.steps.map((step) => ({
      key: `step-${(stepKeySeq += 1)}`,
      profileId: step.profileId ?? fallbackProfileId,
      instruction: step.instruction,
      criteria: step.evaluationCriteria ?? '',
    }));
  }
  if (initialValues?.instruction) {
    return [
      {
        key: `step-${(stepKeySeq += 1)}`,
        profileId: fallbackProfileId,
        instruction: initialValues.instruction,
        criteria: initialValues.evaluationCriteria ?? '',
      },
    ];
  }
  return [newStep(fallbackProfileId)];
}

/**
 * Multi-step composer (design: Stacked step-cards). Build an ordered list of
 * steps — each on its own connection — then test the active step and save.
 * Steps run in sequence, reusing each connection's saved session (no re-login).
 */
export function InstructionComposer({
  taskId,
  connection,
  connections = [],
  mode,
  initialValues,
  isSaving,
  onCancel,
  onCreate,
  onUpdate,
  onSaved,
  onReconnect,
}: InstructionComposerProps) {
  const [steps, setSteps] = useState<EditableStep[]>(() =>
    initialSteps(initialValues, connection.profileId),
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const [phase, setPhase] = useState<TestPhase>('idle');
  const [testRun, setTestRun] = useState<{ runId: string; accessToken: string } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<SignInStep[]>([]);
  const [result, setResult] = useState<InstructionTestResult | null>(null);

  const { startTest, closeTestSession, isStarting } = useInstructionTest();

  // Always include the primary connection (deduped) so every step's connection
  // has a matching option — otherwise the picker shows the raw profile id.
  const availableConnections = useMemo(() => {
    const byId = new Map<string, ConnectionRef>();
    for (const item of connections) byId.set(item.profileId, item);
    if (!byId.has(connection.profileId)) byId.set(connection.profileId, connection);
    return [...byId.values()];
  }, [connections, connection]);
  const connectionOf = useCallback(
    (profileId: string) =>
      availableConnections.find((item) => item.profileId === profileId) ?? connection,
    [availableConnections, connection],
  );

  const activeStep = steps[activeIndex] ?? steps[0];
  const activeConnection = connectionOf(activeStep.profileId);
  const host = useMemo(() => hostnameOf(activeConnection.url), [activeConnection.url]);

  const blockedStepIndex = steps.findIndex((step) => {
    const status = connectionOf(step.profileId).status;
    return status !== 'verified';
  });
  const canSave = steps.every((step) => step.instruction.trim());

  const { run: runState, error: runError } = useRealtimeRun(testRun?.runId ?? '', {
    accessToken: testRun?.accessToken,
    enabled: !!testRun,
  });

  useEffect(() => {
    const streamed = runState?.metadata?.testSteps as SignInStep[] | undefined;
    if (streamed) setTimeline(streamed);
  }, [runState]);

  useEffect(() => {
    if (!testRun) return;
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
      finalize({
        success: false,
        error:
          runState.status === 'TIMED_OUT'
            ? 'The AI ran out of time before finishing. Try a more specific instruction.'
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

  const resetTest = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setTimeline([]);
    setSessionId((current) => {
      if (current) void closeTestSession(current);
      return null;
    });
    setLiveViewUrl(null);
    setTestRun(null);
  }, [closeTestSession]);

  const patchStep = useCallback(
    (index: number, patch: Partial<EditableStep>) => {
      setSteps((current) =>
        current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
      );
    },
    [],
  );

  const handleActivate = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      resetTest();
      setActiveIndex(index);
    },
    [activeIndex, resetTest],
  );

  const handleAddStep = useCallback(() => {
    resetTest();
    setSteps((current) => [...current, newStep(connection.profileId)]);
    setActiveIndex(steps.length);
  }, [connection.profileId, steps.length, resetTest]);

  const handleRemoveStep = useCallback(
    (index: number) => {
      resetTest();
      setSteps((current) => current.filter((_, i) => i !== index));
      setActiveIndex((current) => Math.max(0, current > index ? current - 1 : current === index ? Math.min(current, steps.length - 2) : current));
    },
    [resetTest, steps.length],
  );

  const handleMove = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= steps.length) return;
      setSteps((current) => {
        const next = [...current];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
      setActiveIndex(target);
    },
    [steps.length],
  );

  const handleTest = useCallback(async () => {
    if (!activeStep.instruction.trim()) {
      toast.error('Add an instruction for this step first.');
      return;
    }
    if (sessionId) void closeTestSession(sessionId);
    setTimeline([]);
    setResult(null);
    setSessionId(null);
    setLiveViewUrl(null);
    setPhase('testing');

    const handle = await startTest({
      profileId: activeStep.profileId,
      targetUrl: activeConnection.url,
      instruction: activeStep.instruction.trim(),
      evaluationCriteria: activeStep.criteria.trim() ? activeStep.criteria.trim() : undefined,
      taskId,
    });
    if (!handle) {
      setPhase('idle');
      return;
    }
    setSessionId(handle.sessionId);
    setLiveViewUrl(handle.liveViewUrl);
    setTestRun({ runId: handle.runId, accessToken: handle.publicAccessToken });
  }, [activeStep, activeConnection.url, sessionId, closeTestSession, startTest, taskId]);

  const handleSave = useCallback(async () => {
    if (!canSave) {
      toast.error('Every step needs an instruction.');
      return;
    }
    const stepInputs: BrowserAutomationStepInput[] = steps.map((step) => ({
      profileId: step.profileId,
      targetUrl: connectionOf(step.profileId).url,
      instruction: step.instruction.trim(),
      evaluationCriteria: step.criteria.trim() ? step.criteria.trim() : undefined,
    }));
    const input: InstructionInput = {
      name: deriveName(steps[0].instruction),
      targetUrl: stepInputs[0].targetUrl,
      instruction: stepInputs[0].instruction,
      evaluationCriteria: stepInputs[0].evaluationCriteria ?? undefined,
      steps: stepInputs,
    };
    const ok = initialValues?.id
      ? await onUpdate({ automationId: initialValues.id, input })
      : await onCreate(input);
    if (ok) onSaved();
  }, [canSave, steps, connectionOf, initialValues?.id, onCreate, onUpdate, onSaved]);

  const handleCancel = useCallback(() => {
    if (sessionId) void closeTestSession(sessionId);
    onCancel();
  }, [sessionId, closeTestSession, onCancel]);

  const testing = phase === 'testing';
  const checkCount = steps.filter((step) => step.criteria.trim()).length;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <div className="text-base text-foreground">
            {mode === 'edit' ? 'Edit automation' : 'New automation'}
            <span className="ml-2 text-xs text-muted-foreground">
              {steps.length} {steps.length === 1 ? 'step' : 'steps'}
              {checkCount > 0 && ` · ${checkCount} ${checkCount === 1 ? 'check' : 'checks'}`}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Steps run in order, unattended. Saved sessions are reused — no re-login
            between vendors.
          </p>
        </div>
        <button
          onClick={handleCancel}
          aria-label="Close"
          className="grid h-6 w-6 cursor-pointer place-items-center rounded-sm text-muted-foreground hover:text-foreground"
        >
          <Close size={12} />
        </button>
      </div>

      <div className="flex min-h-[430px] flex-col md:flex-row">
        {/* Left — the step list */}
        <div className="flex flex-col gap-2 border-b border-border p-6 md:w-[420px] md:flex-none md:border-b-0 md:border-r">
          {steps.map((step, index) => (
            <div key={step.key} className="flex flex-col gap-2">
              {index > 0 && (
                <div className="flex items-center gap-2 pl-2 text-[10.5px] text-muted-foreground">
                  <span className="h-3 w-px bg-border" />
                  session reused — no sign-in
                </div>
              )}
              <StepCard
                step={step}
                index={index}
                total={steps.length}
                isActive={index === activeIndex}
                connections={availableConnections}
                connection={connectionOf(step.profileId)}
                onActivate={() => handleActivate(index)}
                onChange={(patch) => patchStep(index, patch)}
                onRemove={() => handleRemoveStep(index)}
                onMove={(direction) => handleMove(index, direction)}
                onReconnect={(conn) => onReconnect?.(conn)}
              />
            </div>
          ))}

          <div className="pt-1">
            <Button variant="outline" onClick={handleAddStep} iconLeft={<Add size={13} />}>
              Add step — another vendor, same run
            </Button>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <Button
              width="full"
              variant="outline"
              onClick={handleTest}
              disabled={isStarting || testing}
              loading={testing}
              iconLeft={!testing ? <Play size={11} /> : undefined}
            >
              {testing ? 'Testing…' : 'Test this step'}
            </Button>
            <Button
              width="full"
              onClick={handleSave}
              loading={isSaving}
              disabled={isSaving || !canSave || blockedStepIndex !== -1}
            >
              {blockedStepIndex !== -1
                ? `Fix step ${blockedStepIndex + 1} to save`
                : 'Save automation'}
            </Button>
          </div>
        </div>

        {/* Right — test the active step */}
        <div className="flex flex-1 flex-col p-6" style={{ background: 'var(--muted)' }}>
          <InstructionTestPanel
            phase={phase}
            host={host}
            liveViewUrl={liveViewUrl}
            steps={timeline}
            result={result}
          />
        </div>
      </div>
    </div>
  );
}
