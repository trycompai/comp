'use client';

import { apiClient } from '@/lib/api-client';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@trycompai/design-system';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { LoginAnalysis } from '../../hooks/types';
import { useBrowserContext } from '../../hooks/useBrowserContext';
import { useLoginAnalysis } from '../../hooks/useLoginAnalysis';
import {
  clearConnectState,
  loadConnectState,
  saveConnectState,
} from './connect-flow-storage';
import { normalizeUrl, stripScheme } from './connect-url';
import { ConnectCaptureForm, type ConnectCaptureFormData } from './ConnectCaptureForm';
import { ConnectFlowRail } from './ConnectFlowRail';

type Step =
  'enter-url' | 'checking' | 'recommendation' | 'signin' | 'capture' | 'connected' | 'error';

const RAIL_INDEX: Record<Step, number> = {
  'enter-url': 0,
  checking: 1,
  recommendation: 2,
  signin: 2,
  capture: 3,
  connected: 4,
  error: 0,
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'this site';
  }
}

// Terminal run states that aren't a clean success.
const FAILED_RUN_STATUSES = new Set([
  'CANCELED',
  'FAILED',
  'CRASHED',
  'INTERRUPTED',
  'SYSTEM_FAILURE',
  'EXPIRED',
  'TIMED_OUT',
]);

interface ConnectVendorLoginFlowProps {
  taskId: string;
  onConnected: () => void;
  onCancel: () => void;
}

export function ConnectVendorLoginFlow({
  taskId,
  onConnected,
  onCancel,
}: ConnectVendorLoginFlowProps) {
  // Rehydrate an in-flight analysis if the user navigated away and came back.
  // The Trigger.dev task keeps running server-side; this restores the UI's view
  // of it (see connect-flow-storage). Only the analysis phase is resumable.
  const persisted = useMemo(() => loadConnectState(taskId), [taskId]);

  const [step, setStep] = useState<Step>(persisted?.step ?? 'enter-url');
  const [urlInput, setUrlInput] = useState(
    persisted ? stripScheme(persisted.url) : '',
  );
  const [url, setUrl] = useState(persisted?.url ?? '');
  const [analysis, setAnalysis] = useState<LoginAnalysis | null>(
    persisted?.analysis ?? null,
  );
  const [analyzeRun, setAnalyzeRun] = useState<{
    runId: string;
    accessToken: string;
  } | null>(persisted?.analyzeRun ?? null);
  const [isStoring, setIsStoring] = useState(false);

  const context = useBrowserContext();
  const { startAnalysis, isStarting } = useLoginAnalysis();

  // The analysis (browser + AI) runs as a background Trigger.dev task so it can
  // outlast HTTP/browser timeouts. Subscribe to its run and pick up the result
  // when it finishes. Watching `run`/`error` (rather than only onComplete) also
  // handles the resume case, where the run may already be complete on subscribe.
  const { run: analyzeRunState, error: analyzeError } = useRealtimeRun(
    analyzeRun?.runId ?? '',
    {
      accessToken: analyzeRun?.accessToken,
      enabled: !!analyzeRun,
    },
  );

  useEffect(() => {
    if (!analyzeRun) return;

    if (analyzeError) {
      setAnalyzeRun(null);
      setStep('error');
      return;
    }
    if (!analyzeRunState) return;

    if (analyzeRunState.status === 'COMPLETED') {
      setAnalyzeRun(null);
      if (analyzeRunState.output) {
        setAnalysis(analyzeRunState.output as LoginAnalysis);
        setStep('recommendation');
      } else {
        setStep('error');
      }
    } else if (FAILED_RUN_STATUSES.has(analyzeRunState.status)) {
      setAnalyzeRun(null);
      setStep('error');
    }
  }, [analyzeRun, analyzeRunState, analyzeError]);

  // Persist the analysis phase so a page unmount (navigation, tab switch) can
  // resume instead of forcing a restart. Only persist when there's actually
  // something to resume from — a run handle to re-subscribe to, or a result to
  // show — so we never restore into a dead-end. Other steps aren't resumable.
  useEffect(() => {
    if (step === 'checking' && analyzeRun) {
      saveConnectState(taskId, { step, url, analyzeRun, analysis });
    } else if (step === 'recommendation' && analysis) {
      saveConnectState(taskId, { step, url, analyzeRun, analysis });
    } else {
      clearConnectState(taskId);
    }
  }, [taskId, step, url, analyzeRun, analysis]);

  // Verify succeeded → move on to capturing the reusable credentials.
  useEffect(() => {
    if (step === 'signin' && context.status === 'has-context') setStep('capture');
  }, [step, context.status]);

  const handleAnalyze = useCallback(async () => {
    const target = normalizeUrl(urlInput);
    setUrl(target);
    setStep('checking');
    const handle = await startAnalysis(target);
    if (!handle) {
      setStep('error');
      return;
    }
    setAnalyzeRun({ runId: handle.runId, accessToken: handle.publicAccessToken });
  }, [startAnalysis, urlInput]);

  const handleStartSignin = useCallback(() => {
    setStep('signin');
    void context.startAuth(url);
  }, [context, url]);

  const handleCapture = useCallback(
    async (data: ConnectCaptureFormData) => {
      if (!context.profileId) {
        toast.error('Lost the connection — please reconnect.');
        setStep('error');
        return;
      }
      setIsStoring(true);
      try {
        const res = await apiClient.post(
          `/v1/browserbase/profiles/${context.profileId}/credentials`,
          {
            username: data.username,
            password: data.password,
            totpSeed: data.totpSeed?.trim() || undefined,
            extraFields: data.extraFields?.length ? data.extraFields : undefined,
          },
        );
        if (res.error) {
          toast.error(res.error);
          return;
        }
        setStep('connected');
      } finally {
        setIsStoring(false);
      }
    },
    [context.profileId],
  );

  const handleCancel = useCallback(() => {
    void context.cancelAuth();
    onCancel();
  }, [context, onCancel]);

  const host = hostnameOf(url || urlInput);
  const railSubtitle =
    step === 'connected'
      ? 'Connected'
      : step === 'checking'
        ? 'Checking the sign-in page'
        : step === 'capture'
          ? 'Signed in · a couple details left'
          : step === 'signin'
            ? 'Your turn — sign in once'
            : 'So Comp AI can capture evidence on a schedule';

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-1 sm:grid-cols-[250px_1fr]">
        <ConnectFlowRail
          title={step === 'enter-url' ? 'Connect a vendor login' : host}
          subtitle={railSubtitle}
          currentIndex={RAIL_INDEX[step]}
          allDone={step === 'connected'}
          detecting={step === 'checking'}
          analysis={step === 'recommendation' || step === 'capture' ? analysis : null}
        />

        <div className="flex min-h-[320px] flex-col items-center justify-center p-8">
          {step === 'enter-url' && (
            <div className="flex w-full max-w-sm flex-col gap-2.5">
              <div className="text-sm text-foreground">Vendor website</div>
              <InputGroup>
                <InputGroupAddon>https://</InputGroupAddon>
                <InputGroupInput
                  value={urlInput}
                  onChange={(e) => setUrlInput(stripScheme(e.target.value))}
                  placeholder="notion.so"
                />
              </InputGroup>
              <div className="text-xs text-muted-foreground">
                Just the website is enough — we&apos;ll find the sign-in page for you.
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Button
                  onClick={handleAnalyze}
                  loading={isStarting}
                  disabled={isStarting || !urlInput.trim()}
                >
                  Continue
                </Button>
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === 'checking' && (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-3 text-sm text-foreground">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                Finding the sign-in page and checking how it works
              </div>
              <div className="text-xs text-muted-foreground">
                This runs in the background — usually under a minute. You can switch pages
                and come back; we&apos;ll pick up where you left off.
              </div>
            </div>
          )}

          {step === 'recommendation' && analysis && (
            <div className="flex w-full max-w-md flex-col gap-3">
              <div className="text-base text-foreground">{analysis.recommendation.headline}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {analysis.recommendation.detail}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Button onClick={handleStartSignin}>
                  {analysis.recommendation.category === 'manual' ? 'Sign In' : 'Start Signing In'}
                </Button>
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === 'signin' && (
            <div className="flex w-full flex-col gap-3">
              {context.liveViewUrl ? (
                <div className="overflow-hidden rounded-md border border-border">
                  <iframe
                    src={context.liveViewUrl}
                    title="Live sign-in"
                    className="h-[420px] w-full"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    allow="clipboard-read; clipboard-write"
                  />
                </div>
              ) : (
                <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
                  <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                  Opening {host}…
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Sign in above, then confirm — encrypted, we record only what the automation needs.
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => context.checkAuth(url)}
                    loading={context.status === 'checking'}
                    disabled={!context.liveViewUrl || context.status === 'checking'}
                  >
                    I&apos;ve signed in
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'capture' && (
            <ConnectCaptureForm isSubmitting={isStoring} onSubmit={handleCapture} />
          )}

          {step === 'connected' && (
            <div className="flex w-full max-w-md flex-col gap-3 text-center">
              <div className="text-base text-foreground">{host} is connected</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                The scheduler now signs in on its own. If a human is ever needed, we&apos;ll email
                you — runs pause, never fail silently.
              </div>
              <div className="mt-1 flex justify-center">
                <Button onClick={onConnected}>Done</Button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="flex w-full max-w-md flex-col gap-3">
              <div className="text-base text-foreground">We couldn&apos;t reach that website</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Double-check the address and try again.
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Button onClick={() => setStep('enter-url')}>Try Again</Button>
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
