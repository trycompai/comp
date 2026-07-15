'use client';

import { apiClient } from '@/lib/api-client';
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

interface ConnectVendorLoginFlowProps {
  onConnected: () => void;
  onCancel: () => void;
}

export function ConnectVendorLoginFlow({ onConnected, onCancel }: ConnectVendorLoginFlowProps) {
  const [step, setStep] = useState<Step>('enter-url');
  const [urlInput, setUrlInput] = useState('https://github.com');
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<LoginAnalysis | null>(null);
  const [isStoring, setIsStoring] = useState(false);

  const context = useBrowserContext();
  const { analyze, isAnalyzing } = useLoginAnalysis();

  // Verify succeeded → move on to capturing the reusable credentials.
  useEffect(() => {
    if (step === 'signin' && context.status === 'has-context') setStep('capture');
  }, [step, context.status]);

  const handleAnalyze = useCallback(async () => {
    setUrl(urlInput);
    setStep('checking');
    const result = await analyze(urlInput);
    if (!result) {
      setStep('error');
      return;
    }
    setAnalysis(result);
    setStep('recommendation');
  }, [analyze, urlInput]);

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
              <div className="text-sm text-foreground">Vendor sign-in URL</div>
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://app.vendor.com/login"
              />
              <div className="text-xs text-muted-foreground">
                The page where you normally sign in.
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Button
                  onClick={handleAnalyze}
                  loading={isAnalyzing}
                  disabled={isAnalyzing || !urlInput}
                >
                  Open Site
                </Button>
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === 'checking' && (
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
              Reading the sign-in page — under 30 seconds
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
              <div className="text-base text-foreground">We couldn&apos;t reach that address</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Check for typos, or paste the exact page where you sign in.
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
