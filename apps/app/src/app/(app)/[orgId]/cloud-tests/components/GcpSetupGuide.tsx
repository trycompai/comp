'use client';

import { useApi } from '@/hooks/use-api';
import { Check, Copy, ExternalLink, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface GcpSetupGuideProps {
  connectionId: string;
  hasOrgId: boolean;
  hasSelectedProjects: boolean;
  onRunScan: () => void;
  isScanning: boolean;
  orgId: string;
}

interface GcpProject {
  id: string;
  name: string;
}

interface SetupStep {
  id: string;
  name: string;
  success: boolean;
  error?: string;
  actionUrl?: string;
  actionText?: string;
  requiredForScan?: boolean;
  resolveAction?: {
    label: string;
    method: 'POST';
    endpoint: string;
    body: { stepId: string };
  };
  adminActions?: Array<
    | { kind: 'link'; label: string; url: string }
    | { kind: 'command'; label: string; command: string }
  >;
}


export function GcpSetupGuide({
  connectionId,
  hasOrgId,
  hasSelectedProjects,
  onRunScan,
  isScanning,
  orgId,
}: GcpSetupGuideProps) {
  const api = useApi();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [resolvingStepId, setResolvingStepId] = useState<string | null>(null);
  const [copiedCommandKey, setCopiedCommandKey] = useState<string | null>(null);
  const [projects, setProjects] = useState<GcpProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [setupResult, setSetupResult] = useState<{
    email: string | null;
    steps: SetupStep[];
    organizationId?: string;
  } | null>(null);

  const ranRef = useRef(false);

  // Auto-run setup on first mount (only if projects are selected)
  useEffect(() => {
    if (ranRef.current || !hasSelectedProjects) return;
    ranRef.current = true;
    handleAutoSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelectedProjects]);

  const hasBlockingFailuresForSteps = (steps: SetupStep[]) =>
    steps.some((step) => !step.success && step.requiredForScan !== false);

  const handleAutoSetup = async (overrideProjectId?: string) => {
    setIsSettingUp(true);
    try {
      const body: { projectId?: string } = {};
      const projectToUse = overrideProjectId ?? selectedProjectId;
      if (projectToUse) body.projectId = projectToUse;

      const resp = await api.post<{
        email: string | null;
        steps: SetupStep[];
        organizationId?: string;
        projectId?: string;
        projects?: GcpProject[];
      }>(`/v1/cloud-security/setup-gcp/${connectionId}`, body);

      if (resp.error) {
        toast.error(typeof resp.error === 'string' ? resp.error : 'Setup failed');
        return;
      }

      if (resp.data) {
        setSetupResult(resp.data);
        if (resp.data.projects?.length) setProjects(resp.data.projects);
        if (resp.data.projectId) setSelectedProjectId(resp.data.projectId);

        const succeeded = resp.data.steps.filter((s) => s.success).length;
        const total = resp.data.steps.length;
        const hasBlockingFailures = hasBlockingFailuresForSteps(resp.data.steps);
        if (!hasBlockingFailures) {
          toast.success('Required setup complete — running first scan...');
          onRunScan();
        } else {
          toast.message(`${succeeded}/${total} steps completed. See details below.`);
        }
      }
    } catch {
      toast.error('Setup failed');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleResolveStep = async (step: SetupStep) => {
    if (!step.resolveAction) return;
    setResolvingStepId(step.id);
    try {
      const resp = await api.post<{
        email: string | null;
        step: SetupStep;
        organizationId?: string;
        projects?: GcpProject[];
      }>(step.resolveAction.endpoint, step.resolveAction.body);

      if (resp.data?.projects?.length) setProjects(resp.data.projects);

      if (resp.error || !resp.data?.step) {
        toast.error(typeof resp.error === 'string' ? resp.error : 'Could not resolve this step');
        return;
      }

      const wasBlocking = setupResult ? hasBlockingFailuresForSteps(setupResult.steps) : true;
      let nextSteps: SetupStep[] = [];

      setSetupResult((prev) => {
        const previous = prev ?? {
          email: resp.data?.email ?? null,
          organizationId: resp.data?.organizationId,
          steps: [],
        };
        const existing = previous.steps.find((s) => s.id === resp.data!.step.id);
        nextSteps = existing
          ? previous.steps.map((s) => (s.id === resp.data!.step.id ? resp.data!.step : s))
          : [...previous.steps, resp.data!.step];

        return {
          ...previous,
          email: resp.data?.email ?? previous.email,
          organizationId: resp.data?.organizationId ?? previous.organizationId,
          steps: nextSteps,
        };
      });

      if (resp.data.step.success) {
        toast.success(`${resp.data.step.name} resolved`);
      } else {
        toast.message(`Still blocked: ${resp.data.step.name}`);
      }

      const isBlockingNow = hasBlockingFailuresForSteps(
        nextSteps.length > 0 ? nextSteps : setupResult?.steps ?? [],
      );
      if (wasBlocking && !isBlockingNow) {
        toast.success('Required setup complete — running first scan...');
        onRunScan();
      }
    } catch {
      toast.error('Could not resolve this step');
    } finally {
      setResolvingStepId(null);
    }
  };

  const handleCopyCommand = async (copyKey: string, command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommandKey(copyKey);
      setTimeout(() => setCopiedCommandKey(null), 1600);
      toast.success('Command copied');
    } catch {
      toast.error('Failed to copy command');
    }
  };

  const allStepsSucceeded = setupResult?.steps.every((s) => s.success);
  const failedSteps = setupResult?.steps.filter((s) => !s.success) ?? [];
  const failedRequiredSteps = failedSteps.filter((step) => step.requiredForScan !== false);
  const failedOptionalSteps = failedSteps.filter((step) => step.requiredForScan === false);
  const hasBlockingFailures = failedRequiredSteps.length > 0;
  const getAdminActions = (step: SetupStep) =>
    step.adminActions ??
    (step.actionUrl && step.actionText
      ? [{ kind: 'link' as const, label: step.actionText, url: step.actionUrl }]
      : []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Get started with GCP scanning</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            OAuth signs in your account, but GCP still requires org-level IAM/API access for Security Command Center. We&apos;ll try to set it up automatically first.
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            For full auto-fix and rollback capabilities, connect with a GCP account that has Owner or Editor role on the selected projects.
          </p>
        </div>

        {/* No projects selected — direct user to integrations page */}
        {!hasSelectedProjects && (
          <div className="space-y-3">
            <StepRow done label="Connected via OAuth" />
            {hasOrgId && <StepRow done label="Organization detected" />}
            <StepRow failed label="No projects selected" error="Select at least one GCP project to scan." />
            <a
              href={`/${orgId}/integrations/gcp`}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              Select projects in GCP integration settings
              <span aria-hidden>→</span>
            </a>
          </div>
        )}

        {/* Auto-setup in progress */}
        {hasSelectedProjects && !setupResult && (
          <div className="space-y-3">
            <StepRow done label="Connected via OAuth" />
            {hasOrgId && <StepRow done label="Organization detected" />}

            <div className="flex items-center justify-center gap-2 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Setting up GCP scanning...</p>
            </div>
          </div>
        )}

        {/* Setup results */}
        {setupResult && (
          <div className="space-y-2">
            <StepRow done label="Connected via OAuth" />
            {setupResult.organizationId && (
              <StepRow done label={`Organization: ${setupResult.organizationId}`} />
            )}
            {setupResult.email && (
              <StepRow done label={`Account: ${setupResult.email}`} />
            )}

            {/* Project info */}
            {selectedProjectId && (
              <StepRow
                done
                label={`Setup project: ${projects.find((p) => p.id === selectedProjectId)?.name ?? selectedProjectId}`}
              />
            )}

            {setupResult.steps.map((step) => (
              <StepRow
                key={step.id}
                done={step.success}
                failed={!step.success}
                optional={!step.success && step.requiredForScan === false}
                label={step.name}
                error={step.error}
              />
            ))}
          </div>
        )}

        {/* Manual fallback for failed steps */}
        {setupResult && !allStepsSucceeded && (
          <div
            className={`rounded-lg border p-3 ${
              hasBlockingFailures
                ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20'
                : 'border-primary/20 bg-primary/[0.05] dark:border-primary/30 dark:bg-primary/[0.1]'
            }`}
          >
            <p
              className={`mb-2 text-xs font-medium ${
                hasBlockingFailures
                  ? 'text-amber-800 dark:text-amber-300'
                  : 'text-primary'
              }`}
            >
              {hasBlockingFailures
                ? 'Some required setup steps need manual action:'
                : 'Scan can still work. The remaining steps are optional for auto-setup:'}
            </p>
            <div className="space-y-2">
              {failedSteps.map((step) => (
                <div key={step.id} className="rounded-md border bg-background/70 p-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">{step.name}</p>
                      {step.error && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{step.error}</p>
                      )}
                    </div>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        step.requiredForScan === false
                          ? 'bg-primary/10 text-primary'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {step.requiredForScan === false ? 'Optional' : 'Required'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {step.resolveAction && (
                      <button
                        type="button"
                        disabled={resolvingStepId === step.id}
                        onClick={() => handleResolveStep(step)}
                        className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/50 disabled:opacity-50"
                      >
                        {resolvingStepId === step.id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Resolving...
                          </>
                        ) : (
                          step.resolveAction.label
                        )}
                      </button>
                    )}
                    {getAdminActions(step).map((action, index) =>
                      action.kind === 'link' ? (
                        <a
                          key={`${step.id}-admin-link-${index}`}
                          href={action.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-[11px] font-medium text-primary hover:bg-muted/50"
                        >
                          {action.label}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <button
                          key={`${step.id}-admin-command-${index}`}
                          type="button"
                          onClick={() => handleCopyCommand(`${step.id}-${index}`, action.command)}
                          className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/50"
                        >
                          <Copy className="h-3 w-3" />
                          {copiedCommandKey === `${step.id}-${index}`
                            ? 'Copied'
                            : action.label}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!hasBlockingFailures && failedOptionalSteps.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Optional steps improve automatic setup and future onboarding, but they are not required for reading findings.
              </p>
            )}
          </div>
        )}

        {/* Run scan button — only shown if setup partially failed */}
        {setupResult && !allStepsSucceeded && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleAutoSetup()}
              disabled={isSettingUp}
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {isSettingUp ? 'Resolving...' : 'Resolve all'}
            </button>
            <button
              type="button"
              onClick={onRunScan}
              disabled={isScanning}
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {isScanning
                ? 'Scanning...'
                : hasBlockingFailures
                  ? 'Try Scanning Anyway'
                  : 'Run Scan'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

function StepRow({
  done,
  failed,
  optional,
  label,
  error,
}: {
  done?: boolean;
  failed?: boolean;
  optional?: boolean;
  label: string;
  error?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5 ${
          done
            ? 'bg-primary/10'
            : optional
              ? 'bg-amber-100 dark:bg-amber-900/30'
              : failed
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'border border-muted-foreground/30'
        }`}
      >
        {done && <Check className="h-3 w-3 text-primary" />}
        {failed && <X className={`h-3 w-3 ${optional ? 'text-amber-600' : 'text-red-500'}`} />}
      </div>
      <div>
        <p
          className={`text-sm ${
            done
              ? 'text-muted-foreground'
              : optional
                ? 'text-amber-800 dark:text-amber-300'
                : failed
                  ? 'text-foreground'
                  : 'font-medium'
          }`}
        >
          {label}
        </p>
        {error && (
          <p className={`mt-0.5 text-[11px] ${optional ? 'text-amber-700 dark:text-amber-400' : 'text-red-500'}`}>{error}</p>
        )}
      </div>
    </div>
  );
}
