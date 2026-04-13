'use client';

import { useApi } from '@/hooks/use-api';
import { Badge } from '@trycompai/ui/badge';
import { Button } from '@trycompai/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { AlertTriangle, ListOrdered, Loader2, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AcknowledgmentPanel } from './AcknowledgmentPanel';
import { PermissionErrorPanel } from './PermissionErrorPanel';

interface RemediationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  checkResultId: string;
  remediationKey: string;
  findingTitle: string;
  providerSlug?: string;
  guidedOnly?: boolean;
  guidedSteps?: string[];
  risk?: string;
  description?: string;
  onComplete?: () => void;
}

interface PreviewData {
  currentState: Record<string, unknown>;
  proposedState: Record<string, unknown>;
  description: string;
  risk: string;
  apiCalls: string[];
  requiresAcknowledgment?: 'type-to-confirm' | 'checkbox';
  acknowledgmentMessage?: string;
  confirmationPhrase?: string;
  guidedOnly?: boolean;
  guidedSteps?: string[];
  rollbackSupported?: boolean;
  missingPermissions?: string[];
  permissionFixScript?: string;
  allRequiredPermissions?: string[];
}

const RISK_STYLES: Record<string, string> = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  medium: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  high: 'border-red-200 bg-red-50 text-red-700',
  critical: 'border-purple-200 bg-purple-50 text-purple-700',
};

// ─── Helper components (must be declared before RemediationDialog) ──────

function RichText({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) {
    return <p className="text-muted-foreground leading-relaxed">{text}</p>;
  }
  return (
    <p className="text-muted-foreground leading-relaxed">
      {parts.map((part, i) =>
        part.match(urlRegex) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 break-all">{part}</a>
        ) : (<span key={i}>{part}</span>),
      )}
    </p>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="group relative rounded-md border bg-muted/50">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded border bg-background text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100"
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
      </button>
      <pre className="overflow-x-auto px-3 py-2 pr-9 text-[11px] font-mono leading-relaxed text-foreground whitespace-pre-wrap break-words">
        {code}
      </pre>
    </div>
  );
}

function TextSegment({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  const rendered: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] ?? '';
    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1);
      if (code.length > 60 || code.startsWith('aws ') || code.includes(' --')) {
        rendered.push(<CodeBlock key={`cb${i}`} code={code} />);
      } else {
        rendered.push(<code key={`ic${i}`} className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono text-foreground">{code}</code>);
      }
    } else if (part.trim()) {
      rendered.push(<RichText key={`rt${i}`} text={part} />);
    }
  }
  return <>{rendered}</>;
}

function TextWithInlineCode({ text }: { text: string }) {
  const jsonSplit = text.split(/(\{[^{}]*"(?:Version|Effect|Statement)"[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g);
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < jsonSplit.length; i++) {
    const segment = jsonSplit[i] ?? '';
    if (segment.startsWith('{') && (segment.includes('"Version"') || segment.includes('"Effect"'))) {
      try {
        elements.push(<CodeBlock key={`json${i}`} code={JSON.stringify(JSON.parse(segment), null, 2)} />);
      } catch { elements.push(<CodeBlock key={`json${i}`} code={segment} />); }
    } else if (segment.trim()) {
      elements.push(<TextSegment key={`seg${i}`} text={segment} />);
    }
  }
  return <>{elements}</>;
}

function StepContent({ text }: { text: string }) {
  const tripleBacktickParts = text.split(/(```[\s\S]*?```)/g);
  if (tripleBacktickParts.length > 1) {
    return (
      <>
        {tripleBacktickParts.map((part, i) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            return <CodeBlock key={i} code={part.slice(3, -3).replace(/^\w*\n?/, '').trim()} />;
          }
          const trimmed = part.trim();
          if (!trimmed) return null;
          return <TextWithInlineCode key={i} text={trimmed} />;
        })}
      </>
    );
  }
  return <TextWithInlineCode text={text} />;
}

function StateBlock({ label, state }: { label: string; state: Record<string, unknown> }) {
  return (
    <div className="min-w-0 rounded-md border p-2.5 overflow-hidden">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <pre className="text-[11px] leading-relaxed text-foreground whitespace-pre-wrap break-words">{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}

/** Animated loading steps that show progress during analysis. */
function LoadingSteps({ providerSlug }: { providerSlug?: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 4000),
      setTimeout(() => setStep(3), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const providerName = providerSlug === 'gcp' ? 'GCP' : providerSlug === 'azure' ? 'Azure' : 'AWS';
  const steps = [
    { label: 'Analyzing finding', sub: 'Reviewing security configuration' },
    { label: `Reading ${providerName} configuration`, sub: 'Fetching current resource state' },
    { label: 'Checking required permissions', sub: 'Verifying access' },
    { label: 'Preparing fix plan', sub: 'Generating remediation steps' },
  ];

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="py-8 px-1">
      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-muted mb-8 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-1">
        {steps.map(({ label, sub }, i) => {
          const done = i < step;
          const active = i === step;
          const pending = i > step;

          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all duration-500 ${
                active ? 'bg-primary/[0.04]' : ''
              } ${pending ? 'opacity-40' : 'opacity-100'}`}
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {done ? (
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-border" />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm leading-tight ${active ? 'font-medium text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                  {label}
                </p>
                {active && (
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────

export function RemediationDialog({
  open,
  onOpenChange,
  connectionId,
  checkResultId,
  remediationKey,
  findingTitle,
  providerSlug,
  guidedOnly,
  guidedSteps,
  risk,
  description,
  onComplete,
}: RemediationDialogProps) {
  const api = useApi();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isWaitingPropagation, setIsWaitingPropagation] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<{ missingActions: string[]; fixScript?: string } | null>(null);
  const [acknowledgment, setAcknowledgment] = useState<string | null>(null);

  // Ref to store permissions across rechecks (avoids stale closure in useCallback)
  const permissionsRef = useRef<string[] | undefined>(undefined);

  const loadPreview = useCallback(async (recheck = false) => {
    setIsLoadingPreview(true);
    setError(null);
    try {
      const response = await api.post(
        '/v1/cloud-security/remediation/preview',
        {
          connectionId,
          checkResultId,
          remediationKey,
          // On recheck, send the cached permissions so backend doesn't re-run AI
          ...(recheck && permissionsRef.current && {
            cachedPermissions: permissionsRef.current,
          }),
        },
      );
      if (response.error) {
        setError(
          typeof response.error === 'string'
            ? response.error
            : 'Failed to load preview',
        );
        return;
      }
      const previewData = response.data as PreviewData;
      setPreview(previewData);
      // Store permissions in ref so Recheck can access them without stale closure
      if (previewData.allRequiredPermissions) {
        permissionsRef.current = previewData.allRequiredPermissions;
      }
    } catch {
      setError('Failed to load preview');
    } finally {
      setIsLoadingPreview(false);
    }
  }, [api, connectionId, checkResultId, remediationKey]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPermissionError(null);
    setAcknowledgment(null);

    // Guided-only: skip API call, use local data
    if (guidedOnly && guidedSteps) {
      setPreview({
        currentState: {},
        proposedState: {},
        description: description ?? '',
        risk: risk ?? 'medium',
        apiCalls: [],
        guidedOnly: true,
        guidedSteps,
        rollbackSupported: false,
      });
      return;
    }

    setPreview(null);
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, remediationKey]);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setPermissionError(null);
    try {
      const response = await api.post<{
        status: string;
        error?: string;
        permissionError?: { missingActions: string[]; fixScript?: string };
      }>(
        '/v1/cloud-security/remediation/execute',
        { connectionId, checkResultId, remediationKey, acknowledgment },
      );
      if (response.error) {
        const msg =
          typeof response.error === 'string'
            ? response.error
            : 'Remediation failed';
        setError(msg);
        return;
      }

      const data = response.data;
      if (data?.status === 'success') {
        setPreview(null);
        setError(null);
        setSucceeded(true);
        toast.success('Fix applied successfully');
        // Trigger re-scan, then close dialog after user sees confirmation
        onComplete?.();
        setTimeout(() => {
          onOpenChange(false);
          setSucceeded(false);
        }, 4000);
      } else {
        const msg = data?.error || 'Remediation failed';
        setError(msg);
        if (data?.permissionError) {
          setPermissionError(data.permissionError);
        }
      }
    } catch {
      setError('Remediation failed. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRetry = async () => {
    setIsWaitingPropagation(true);
    // IAM permission changes take up to 10s to propagate in AWS
    await new Promise((r) => setTimeout(r, 10_000));
    setIsWaitingPropagation(false);
    await handleExecute();
  };

  const isGuided = preview?.guidedOnly;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-h-[85vh] overflow-y-auto transition-[max-width] duration-300"
        style={{ maxWidth: preview && !isLoadingPreview && !succeeded ? '48rem' : '28rem' }}
      >
        <div className="min-w-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isGuided ? 'Remediation Steps' : 'Auto-Remediate Finding'}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {findingTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 min-w-0">
          {/* Applying state — shown while executing */}
          {isExecuting && !succeeded && !error && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Applying fix...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Executing changes to your cloud infrastructure. This may take a moment.
                </p>
              </div>
            </div>
          )}

          {/* Success state */}
          {succeeded && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Fix applied successfully</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Re-scanning to verify the changes...
                </p>
              </div>
            </div>
          )}

          {isLoadingPreview && !succeeded && (
            preview ? (
              /* Recheck — just verifying permissions */
              <div className="flex items-center justify-center py-6 gap-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying permissions</p>
              </div>
            ) : (
              /* First load — full analysis */
              <LoadingSteps providerSlug={providerSlug} />
            )
          )}

          {error && !succeeded && (
            <PermissionErrorPanel
              error={error}
              missingActions={permissionError?.missingActions}
              fixScript={permissionError?.fixScript}
              apiCalls={preview?.apiCalls}
              onRetry={handleRetry}
              isRetrying={isExecuting}
              isWaiting={isWaitingPropagation}
            />
          )}

          {preview && !isLoadingPreview && (
            <>
              {/* Guided-only: show steps directly */}
              {isGuided && preview.guidedSteps && (
                <div className="space-y-3">
                  {/* Description + risk row */}
                  <div className="flex items-start justify-between gap-3">
                    {preview.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {preview.description}
                      </p>
                    )}
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${RISK_STYLES[preview.risk] ?? RISK_STYLES.medium}`}
                    >
                      {preview.risk}
                    </Badge>
                  </div>

                  {/* Steps card */}
                  <div className="rounded-lg border bg-muted/30 overflow-hidden">
                    <div className="flex items-center gap-2.5 border-b bg-primary/5 px-4 py-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                        <ListOrdered className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">
                        Follow these steps in the {providerSlug === 'azure' ? 'Azure Portal' : providerSlug === 'gcp' ? 'GCP Console' : 'AWS Console'}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <ol className="space-y-4">
                        {preview.guidedSteps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-[13px]">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary mt-0.5">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <StepContent text={step} />
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-muted-foreground/60">
                      {preview.guidedSteps.length} steps to complete
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}

              {/* Auto-fix: show preview + execute */}
              {!isGuided && (
                <>
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">
                    {preview.description}
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Risk:</span>
                      <Badge variant="outline" className={`text-[10px] ${RISK_STYLES[preview.risk] ?? RISK_STYLES.medium}`}>
                        {preview.risk}
                      </Badge>
                    </div>
                    {preview.rollbackSupported !== false && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                        <RotateCcw className="h-3 w-3" />
                        Rollback available
                      </div>
                    )}
                    {preview.rollbackSupported === false && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <AlertTriangle className="h-3 w-3" />
                        Irreversible
                      </div>
                    )}
                  </div>

                  {/* Current vs Proposed */}
                  <div className="grid grid-cols-2 gap-2 min-w-0">
                    <StateBlock label="Current" state={preview.currentState} />
                    <StateBlock label="Proposed" state={preview.proposedState} />
                  </div>

                  {/* API calls — collapsible if many */}
                  {preview.apiCalls.length > 0 && (
                    <details className="text-xs" open>
                      <summary className="cursor-pointer text-muted-foreground font-medium">
                        {preview.apiCalls.length} API calls
                      </summary>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {preview.apiCalls.map((call, i) => {
                          const label = typeof call === 'string'
                            ? call
                            : `${(call as { method?: string }).method} ${(call as { endpoint?: string }).endpoint}`;
                          return (
                            <code key={i} className="rounded bg-muted px-1 py-0.5 text-[10px]">{label}</code>
                          );
                        })}
                      </div>
                    </details>
                  )}

                  {/* Missing permissions — show setup step BEFORE apply */}
                  {preview.missingPermissions && preview.missingPermissions.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                        <p className="text-xs font-medium">
                          {preview.missingPermissions.length} permissions needed
                        </p>
                        <p className="text-[10px] text-muted-foreground">Run in CloudShell, then Recheck</p>
                      </div>
                      <div className="p-3 space-y-2">
                        {preview.permissionFixScript && (
                          <pre className="rounded-md border bg-muted/20 px-3 py-2 text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-words max-h-28 overflow-y-auto">
                            {preview.permissionFixScript}
                          </pre>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (preview.permissionFixScript) {
                                navigator.clipboard.writeText(preview.permissionFixScript.replace(/\s*\\\n\s*/g, ' '));
                                toast.success('Copied');
                              }
                            }}
                            className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            Copy
                          </button>
                          <a
                            href="https://console.aws.amazon.com/cloudshell"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                          >
                            CloudShell
                          </a>
                          <button
                            type="button"
                            onClick={() => loadPreview(true)}
                            disabled={isLoadingPreview}
                            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
                          >
                            {isLoadingPreview ? 'Checking...' : 'Recheck'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Permissions OK — show acknowledgment */
                    <label className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 cursor-pointer select-none dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <input
                        type="checkbox"
                        checked={acknowledgment === 'acknowledged'}
                        onChange={(e) => setAcknowledgment(e.target.checked ? 'acknowledged' : null)}
                        className="mt-0.5 shrink-0"
                      />
                      <span>
                        I have reviewed the changes above and understand this will modify my cloud infrastructure.
                      </span>
                    </label>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                      disabled={isExecuting}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleExecute}
                      disabled={isExecuting || acknowledgment !== 'acknowledged' || (preview.missingPermissions?.length ?? 0) > 0}
                    >
                      {isExecuting ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {isExecuting ? 'Applying...' : 'Apply Fix'}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

