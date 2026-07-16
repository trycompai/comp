'use client';

import { apiClient } from '@/lib/api-client';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { LoginAnalysis } from '../../hooks/types';
import { useAutoSignin } from '../../hooks/useAutoSignin';
import { useBrowserContext } from '../../hooks/useBrowserContext';
import { useLoginAnalysis } from '../../hooks/useLoginAnalysis';
import {
  FAILED_RUN_STATUSES,
  hostnameOf,
  RAIL_INDEX,
  railSubtitleFor,
  takeoverCaptionFor,
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
  // Only the analysis phase is resumable — credentials are never persisted.
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
  const [signinLiveView, setSigninLiveView] = useState<{
    sessionId: string;
    liveViewUrl: string;
    profileId: string;
  } | null>(null);
  const [takeoverReason, setTakeoverReason] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const context = useBrowserContext();
  const { startAnalysis, isStarting } = useLoginAnalysis();
  const { startSignin, isStarting: isStartingSignin } = useAutoSignin();

  const closeSignInSession = useCallback((sessionId: string) => {
    void apiClient.post('/v1/browserbase/session/close', { sessionId });
  }, []);

  // Analysis (browser + AI) runs as a background task. Watching run/error also
  // handles resume, where the run may already be complete on subscribe.
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

  // The automated sign-in also runs as a background task, but on a session we
  // show the user (they watch it). On success we're connected; on any failure we
  // keep that same browser open so the user finishes where the bot stopped.
  const { run: signinRunState, error: signinError } = useRealtimeRun(
    signinRun?.runId ?? '',
    { accessToken: signinRun?.accessToken, enabled: !!signinRun },
  );

  useEffect(() => {
    if (!signinRun) return;

    // Any non-success keeps the same browser open (take-over), so the user sees
    // the real page — the site's error, a 2FA prompt, or a rate-limit/verify
    // step — instead of a disappearing toast, and finishes it in place.
    const handOver = (reason: string) => {
      setSigninRun(null);
      setTakeoverReason(reason);
      setStep('takeover');
    };

    if (signinError) {
      handOver('unknown');
      return;
    }
    if (!signinRunState) return;

    if (signinRunState.status === 'COMPLETED') {
      const output = signinRunState.output as
        | { isLoggedIn?: boolean; failure?: string }
        | undefined;
      if (output?.isLoggedIn) {
        setSigninRun(null);
        if (signinLiveView) closeSignInSession(signinLiveView.sessionId);
        setSigninLiveView(null);
        setStep('connected');
      } else {
        handOver(output?.failure ?? 'unknown');
      }
    } else if (FAILED_RUN_STATUSES.has(signinRunState.status)) {
      handOver('unknown');
    }
  }, [signinRun, signinRunState, signinError, signinLiveView, closeSignInSession]);

  // Persist the analysis phase so a page unmount can resume; never persist creds.
  useEffect(() => {
    if (step === 'checking' && analyzeRun) {
      saveConnectState(taskId, { step, url, analyzeRun, analysis });
    } else if (step === 'choose' && analysis) {
      saveConnectState(taskId, { step, url, analyzeRun, analysis });
    } else {
      clearConnectState(taskId);
    }
  }, [taskId, step, url, analyzeRun, analysis]);

  // Manual/SSO live sign-in verified → connected.
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

  const { startAuth } = context;
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
        handleStartLiveSignin();
        return;
      }
      setSigninLiveView({
        sessionId: handle.sessionId,
        liveViewUrl: handle.liveViewUrl,
        profileId: handle.profileId,
      });
      setSigninRun({ runId: handle.runId, accessToken: handle.publicAccessToken });
      setStep('signing-in');
    },
    [startSignin, url, handleStartLiveSignin],
  );

  const handleTakeoverVerify = useCallback(async () => {
    if (!signinLiveView) return;
    setIsVerifying(true);
    try {
      const res = await apiClient.post<{ auth: { isLoggedIn: boolean } }>(
        `/v1/browserbase/profiles/${signinLiveView.profileId}/verify`,
        { sessionId: signinLiveView.sessionId, url },
      );
      if (res.error || !res.data) {
        toast.error(res.error || 'Could not verify the sign-in.');
        return;
      }
      if (res.data.auth.isLoggedIn) {
        closeSignInSession(signinLiveView.sessionId);
        setSigninLiveView(null);
        setStep('connected');
      } else {
        toast.error('Still not signed in — finish in the browser, then try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  }, [signinLiveView, url, closeSignInSession]);

  const handleReenterDetails = useCallback(() => {
    if (signinLiveView) closeSignInSession(signinLiveView.sessionId);
    setSigninLiveView(null);
    setTakeoverReason(null);
    setStep('capture');
  }, [signinLiveView, closeSignInSession]);

  const handleCancel = useCallback(() => {
    if (signinLiveView) closeSignInSession(signinLiveView.sessionId);
    setSigninLiveView(null);
    void context.cancelAuth();
    onCancel();
  }, [signinLiveView, closeSignInSession, context, onCancel]);

  const host = hostnameOf(url || urlInput);
  const railSubtitle = railSubtitleFor(step);

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
          autoLiveViewUrl={signinLiveView?.liveViewUrl ?? null}
          takeoverCaption={takeoverCaptionFor(takeoverReason)}
          onTakeoverVerify={handleTakeoverVerify}
          onReenterDetails={handleReenterDetails}
          isVerifying={isVerifying}
          onCancel={handleCancel}
          onConnected={onConnected}
          onRetry={() => setStep('enter-url')}
        />
      </div>
    </div>
  );
}
