'use client';

import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { LoginAnalysis } from '../../hooks/types';
import { useAutoSignin } from '../../hooks/useAutoSignin';
import { useBrowserContext } from '../../hooks/useBrowserContext';
import { useLoginAnalysis } from '../../hooks/useLoginAnalysis';
import { useSigninSession } from '../../hooks/useSigninSession';
import {
  FAILED_RUN_STATUSES,
  hostnameOf,
  RAIL_INDEX,
  railSubtitleFor,
  TAKEOVER_CAPTION_2FA,
  TAKEOVER_CAPTION_DEFAULT,
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
  const [takeoverCaption, setTakeoverCaption] = useState(TAKEOVER_CAPTION_DEFAULT);

  const context = useBrowserContext();
  const { startAnalysis, isStarting } = useLoginAnalysis();
  const { startSignin, isStarting: isStartingSignin } = useAutoSignin();
  const { signinLiveView, setSigninLiveView, endSession, isVerifying, verify } =
    useSigninSession();

  // Hand the (still-open) browser to the user to finish the sign-in themselves.
  const goToTakeover = useCallback((failure?: string) => {
    setSigninRun(null);
    toast.info(
      failure === 'needs_2fa'
        ? 'Enter your two-factor code to finish the sign-in.'
        : 'Finish the sign-in in the browser.',
    );
    setTakeoverCaption(
      failure === 'needs_2fa' ? TAKEOVER_CAPTION_2FA : TAKEOVER_CAPTION_DEFAULT,
    );
    setStep('takeover');
  }, []);

  // Analysis (browser + AI) runs as a background task. Watching run/error also
  // handles resume, where the run may already be complete on subscribe.
  const { run: analyzeRunState, error: analyzeError } = useRealtimeRun(
    analyzeRun?.runId ?? '',
    { accessToken: analyzeRun?.accessToken, enabled: !!analyzeRun },
  );

  useEffect(() => {
    if (!analyzeRun) return;
    // Ignore a stale emission from a previous run before the subscription
    // catches up to the current one.
    if (analyzeRunState && analyzeRunState.id !== analyzeRun.runId) return;
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

  // The automated sign-in runs as a background task on a session we show the
  // user (they watch it) and hand over on any failure.
  const { run: signinRunState, error: signinError } = useRealtimeRun(
    signinRun?.runId ?? '',
    { accessToken: signinRun?.accessToken, enabled: !!signinRun },
  );

  useEffect(() => {
    if (!signinRun) return;
    // Ignore stale emissions from the previous run before the subscription
    // catches up — acting on them would close the new session and mis-route.
    if (signinRunState && signinRunState.id !== signinRun.runId) return;
    if (signinError) return goToTakeover();
    if (!signinRunState) return;

    if (signinRunState.status === 'COMPLETED') {
      const output = signinRunState.output as
        | { isLoggedIn?: boolean; failure?: string }
        | undefined;

      // Success and wrong-password both end this session; the rest hand over.
      if (output?.isLoggedIn || output?.failure === 'invalid_credentials') {
        setSigninRun(null);
        endSession();
        if (output?.isLoggedIn) {
          setStep('connected');
        } else {
          toast.error("That username or password wasn't accepted — check and try again.");
          setStep('capture');
        }
      } else {
        goToTakeover(output?.failure);
      }
    } else if (FAILED_RUN_STATUSES.has(signinRunState.status)) {
      goToTakeover();
    }
  }, [signinRun, signinRunState, signinError, endSession, goToTakeover]);

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
      // Release any prior sign-in session before starting a new one.
      endSession();
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
    [startSignin, url, handleStartLiveSignin, endSession, setSigninLiveView],
  );

  const handleTakeoverVerify = useCallback(async () => {
    if (await verify(url)) setStep('connected');
  }, [verify, url]);

  const handleCancel = useCallback(() => {
    endSession();
    void context.cancelAuth();
    onCancel();
  }, [endSession, context, onCancel]);

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
          takeoverCaption={takeoverCaption}
          onTakeoverVerify={handleTakeoverVerify}
          isVerifying={isVerifying}
          onCancel={handleCancel}
          onConnected={onConnected}
          onRetry={() => setStep('enter-url')}
        />
      </div>
    </div>
  );
}
