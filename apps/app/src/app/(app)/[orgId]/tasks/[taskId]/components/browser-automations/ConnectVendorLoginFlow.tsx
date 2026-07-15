'use client';

import { apiClient } from '@/lib/api-client';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { Button, Input } from '@trycompai/design-system';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { LoginAnalysis } from '../../hooks/types';
import { useBrowserContext } from '../../hooks/useBrowserContext';
import { useLoginAnalysis } from '../../hooks/useLoginAnalysis';
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

// Accept whatever the user pastes — a bare domain (notion.so), a homepage, or a
// deep link. We add a scheme if it's missing so they never have to think about
// "http://" or hunt down the exact /login page; the analyzer finds the sign-in
// form from there.
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

interface ConnectVendorLoginFlowProps {
  onConnected: () => void;
  onCancel: () => void;
}

export function ConnectVendorLoginFlow({ onConnected, onCancel }: ConnectVendorLoginFlowProps) {
  const [step, setStep] = useState<Step>('enter-url');
  const [urlInput, setUrlInput] = useState('');
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<LoginAnalysis | null>(null);
  const [analyzeRun, setAnalyzeRun] = useState<{
    runId: string;
    accessToken: string;
  } | null>(null);
  const [isStoring, setIsStoring] = useState(false);

  const context = useBrowserContext();
  const { startAnalysis, isStarting } = useLoginAnalysis();

  // The analysis (browser + AI) runs as a background Trigger.dev task so it can
  // outlast HTTP/browser timeouts. Subscribe to its run and pick up the result
  // when it finishes. `onComplete` fires on any terminal state, so anything that
  // isn't a clean COMPLETED with output is treated as a failure.
  useRealtimeRun(analyzeRun?.runId ?? '', {
    accessToken: analyzeRun?.accessToken,
    enabled: !!analyzeRun,
    onComplete: (run, err) => {
      setAnalyzeRun(null);
      if (err || run.status !== 'COMPLETED' || !run.output) {
        setStep('error');
        return;
      }
      setAnalysis(run.output as LoginAnalysis);
      setStep('recommendation');
    },
  });

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
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="notion.so"
              />
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
                This runs in the background — usually under a minute. You can keep working.
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
