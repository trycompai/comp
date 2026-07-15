'use client';

import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { LoginAnalysis } from '../../hooks/types';
import { useAutoSignin, type AutoSignInFailure } from '../../hooks/useAutoSignin';
import { useBrowserContext } from '../../hooks/useBrowserContext';
import { useLoginAnalysis } from '../../hooks/useLoginAnalysis';
import {
  FAILED_RUN_STATUSES,
  hostnameOf,
  RAIL_INDEX,
  type Step,
} from './connect-flow-constants';
import {
  clearConnectState,
  loadConnectState,
  saveConnectState,
} from './connect-flow-storage';
import { normalizeUrl, stripScheme } from './connect-url';
import type { ConnectCaptureFormData } from './ConnectCaptureForm';
import { ConnectFlowRail } from './ConnectFlowRail';
import { ConnectFlowStage } from './ConnectFlowStage';
import type { ConnectMethodKind } from './ConnectMethodChooser';

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
  // of it (see connect-flow-storage). Only the analysis phase is resumable —
  // credentials are never persisted.
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
  const [signinRun, setSigninRun] = useState<{
    runId: string;
    accessToken: string;
  } | null>(null);

  const context = useBrowserContext();
  const { startAnalysis, isStarting } = useLoginAnalysis();
  const { startSignin, isStarting: isStartingSignin } = useAutoSignin();

  // The analysis (browser + AI) runs as a background Trigger.dev task so it can
  // outlast HTTP/browser timeouts. Watching `run`/`error` (rather than only
  // onComplete) also handles the resume case, where the run may already be
  // complete on subscribe.
  const { run: analyzeRunState, error: analyzeError } = useRealtimeRun(
    analyzeRun?.runId ?? '',
    { accessToken: analyzeRun?.accessToken, enabled: !!analyzeRun },
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
        setStep('choose');
      } else {
        setStep('error');
      }
    } else if (FAILED_RUN_STATUSES.has(analyzeRunState.status)) {
      setAnalyzeRun(null);
      setStep('error');
    }
  }, [analyzeRun, analyzeRunState, analyzeError]);

  // The automated first sign-in also runs as a background task. On success we're
  // connected; if it can't finish unattended (CAPTCHA, email/SMS code, SSO) we
  // hand the live browser to the user — the credentials are already stored.
  const { run: signinRunState, error: signinError } = useRealtimeRun(
    signinRun?.runId ?? '',
    { accessToken: signinRun?.accessToken, enabled: !!signinRun },
  );

  const { startAuth } = context;
  useEffect(() => {
    if (!signinRun) return;

    const fallbackToLive = () => {
      setSigninRun(null);
      toast.info("We couldn't finish sign-in automatically — please finish it here.");
      setStep('signin');
      void startAuth(url);
    };

    if (signinError) {
      fallbackToLive();
      return;
    }
    if (!signinRunState) return;

    if (signinRunState.status === 'COMPLETED') {
      const output = signinRunState.output as
        | { isLoggedIn?: boolean; failure?: AutoSignInFailure }
        | undefined;
      setSigninRun(null);

      if (output?.isLoggedIn) {
        setStep('connected');
      } else if (output?.failure === 'invalid_credentials') {
        // Actionable + our fault to surface: back to the form, not the browser.
        toast.error("That username or password wasn't accepted — check and try again.");
        setStep('capture');
      } else if (output?.failure === 'needs_2fa') {
        toast.info(
          'This account uses two-factor. Finish this sign-in in the browser — or add your authenticator setup key for unattended runs.',
        );
        setStep('signin');
        void startAuth(url);
      } else {
        // challenge / unknown — a human step we can't automate.
        toast.info("We couldn't finish sign-in automatically — please finish it here.");
        setStep('signin');
        void startAuth(url);
      }
    } else if (FAILED_RUN_STATUSES.has(signinRunState.status)) {
      fallbackToLive();
    }
  }, [signinRun, signinRunState, signinError, startAuth, url]);

  // Persist the analysis phase so a page unmount (navigation, tab switch) can
  // resume instead of forcing a restart. Only persist when there's something to
  // resume from; never persist credential steps.
  useEffect(() => {
    if (step === 'checking' && analyzeRun) {
      saveConnectState(taskId, { step, url, analyzeRun, analysis });
    } else if (step === 'choose' && analysis) {
      saveConnectState(taskId, { step, url, analyzeRun, analysis });
    } else {
      clearConnectState(taskId);
    }
  }, [taskId, step, url, analyzeRun, analysis]);

  // Live sign-in verified → connected (SSO/passkey and the fallback path).
  useEffect(() => {
    if (step === 'signin' && context.status === 'has-context') setStep('connected');
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

  const handleStartLiveSignin = useCallback(() => {
    setStep('signin');
    void startAuth(url);
  }, [startAuth, url]);

  const handleChoose = useCallback(
    (kind: ConnectMethodKind) => {
      if (kind === 'password') {
        setStep('capture');
        return;
      }
      handleStartLiveSignin();
    },
    [handleStartLiveSignin],
  );

  const handleCapture = useCallback(
    async (data: ConnectCaptureFormData) => {
      const handle = await startSignin({
        url,
        credentials: {
          username: data.username,
          password: data.password,
          totpSeed: data.totpSeed,
          extraFields: data.extraFields,
        },
      });
      if (!handle) {
        // Storing or triggering failed (already surfaced) — let the user finish
        // in the browser instead of dead-ending.
        handleStartLiveSignin();
        return;
      }
      setSigninRun({ runId: handle.runId, accessToken: handle.publicAccessToken });
      setStep('signing-in');
    },
    [startSignin, url, handleStartLiveSignin],
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
        : step === 'choose'
          ? 'Pick how to sign in'
          : step === 'capture'
            ? 'Enter your sign-in details'
            : step === 'signing-in'
              ? 'Signing in for you'
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
          showDetectPanel={step === 'enter-url' || step === 'checking'}
        />

        <ConnectFlowStage
          step={step}
          host={host}
          analysis={analysis}
          urlInput={urlInput}
          onUrlInputChange={setUrlInput}
          onAnalyze={handleAnalyze}
          isStarting={isStarting}
          onChoose={handleChoose}
          onCapture={handleCapture}
          isStartingSignin={isStartingSignin}
          liveViewUrl={context.liveViewUrl}
          isCheckingLive={context.status === 'checking'}
          onCheckLive={() => context.checkAuth(url)}
          onCancel={handleCancel}
          onConnected={onConnected}
          onRetry={() => setStep('enter-url')}
        />
      </div>
    </div>
  );
}
