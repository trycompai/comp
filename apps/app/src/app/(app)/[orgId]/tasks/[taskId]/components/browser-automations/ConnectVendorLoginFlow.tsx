'use client';

import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ConnectLiveSignin, type LiveSigninVariant } from './ConnectLiveSignin';
import type { ConnectMethodKind } from './ConnectMethodChooser';
import type { SignInStep } from './StepList';

interface ConnectVendorLoginFlowProps {
  taskId: string;
  /** Called with the connected vendor URL so the caller can bind new instructions to it. */
  onConnected: (url: string) => void;
  onCancel: () => void;
  /**
   * Re-authenticate an existing connection instead of connecting a new one:
   * skip URL entry and immediately sign in (password = stored creds, no
   * interaction; sso = AI drives to the IdP, user finishes).
   */
  reconnect?: { url: string; mode: 'password' | 'sso' };
  /** Called after a reconnect verifies (refresh the list; don't open the composer). */
  onReconnected?: () => void;
}

export function ConnectVendorLoginFlow({
  taskId,
  onConnected,
  onCancel,
  reconnect,
  onReconnected,
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
  const [takeoverVariant, setTakeoverVariant] = useState<LiveSigninVariant>('finish');
  // The activity timeline, mirrored into flow state so it survives into the
  // take-over view after the run's realtime subscription is torn down.
  const [signinSteps, setSigninSteps] = useState<SignInStep[]>([]);
  // The authenticated page the sign-in landed on — used as the connection's URL
  // so future runs open the app directly and reuse the session.
  const [connectedUrl, setConnectedUrl] = useState<string | null>(null);

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
    setTakeoverVariant(failure === 'needs_2fa' ? '2fa' : 'finish');
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
        | { isLoggedIn?: boolean; failure?: string; homeUrl?: string }
        | undefined;

      if (output?.isLoggedIn) {
        // Keep the session open for a brief success beat; the effect below
        // closes it and advances to the connected screen.
        if (output.homeUrl) setConnectedUrl(output.homeUrl);
        setSigninRun(null);
        setStep('signed-in');
      } else if (output?.failure === 'invalid_credentials') {
        setSigninRun(null);
        endSession();
        toast.error("That username or password wasn't accepted — check and try again.");
        setStep('capture');
      } else {
        goToTakeover(output?.failure);
      }
    } else if (FAILED_RUN_STATUSES.has(signinRunState.status)) {
      goToTakeover();
    }
  }, [signinRun, signinRunState, signinError, endSession, goToTakeover]);

  // Mirror the live activity timeline into state so it stays visible after the
  // run completes and we hand over.
  useEffect(() => {
    const steps = signinRunState?.metadata?.signinSteps as
      | SignInStep[]
      | undefined;
    if (steps) setSigninSteps(steps);
  }, [signinRunState]);

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

  // Manual/SSO live sign-in verified → success beat.
  useEffect(() => {
    if (step === 'signin' && context.status === 'has-context') setStep('signed-in');
  }, [step, context.status]);

  // Gentle hand-off: hold a brief "Signed in" confirmation over the live browser,
  // then release the session and continue straight into the instruction composer
  // (one flow — no intermediate "connected, now click create" screen).
  useEffect(() => {
    if (step !== 'signed-in') return;
    const timer = setTimeout(() => {
      endSession();
      // Reconnect just refreshes the list; a fresh connect flows into the composer.
      if (reconnect) onReconnected?.();
      else onConnected(connectedUrl ?? url);
    }, 1300);
    return () => clearTimeout(timer);
  }, [step, endSession, onConnected, onReconnected, reconnect, connectedUrl, url]);

  // Reconnect entry point: skip URL entry and immediately re-authenticate.
  const reconnectStarted = useRef(false);
  useEffect(() => {
    if (!reconnect || reconnectStarted.current) return;
    reconnectStarted.current = true;
    setUrl(reconnect.url);
    setStep('signing-in');
    endSession();
    setSigninSteps([]);
    void startSignin({ url: reconnect.url, mode: reconnect.mode }).then((handle) => {
      if (!handle) {
        // Fall back to a manual sign-in in the live browser.
        setStep('signin');
        void context.startAuth(reconnect.url);
        return;
      }
      setSigninLiveView({
        sessionId: handle.sessionId,
        liveViewUrl: handle.liveViewUrl,
        profileId: handle.profileId,
      });
      setSigninRun({ runId: handle.runId, accessToken: handle.publicAccessToken });
    });
  }, [reconnect, startSignin, endSession, setSigninLiveView, context]);

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

  // SSO: the AI opens the identity provider (no credentials to store), then hands
  // the live browser to the user to finish there. Reuses the live sign-in run.
  const handleStartSso = useCallback(async () => {
    endSession();
    setSigninSteps([]);
    const handle = await startSignin({ url, mode: 'sso' });
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
  }, [startSignin, url, handleStartLiveSignin, endSession, setSigninLiveView]);

  const handleChoose = useCallback(
    (kind: ConnectMethodKind) => {
      if (kind === 'password') {
        setStep('capture');
        return;
      }
      if (kind === 'sso') {
        void handleStartSso();
        return;
      }
      handleStartLiveSignin();
    },
    [handleStartSso, handleStartLiveSignin],
  );

  const handleCapture = useCallback(
    async (data: ConnectCaptureFormData) => {
      // Release any prior sign-in session before starting a new one.
      endSession();
      setSigninSteps([]);
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
    if (await verify(url)) setStep('signed-in');
  }, [verify, url]);

  const handleCancel = useCallback(() => {
    endSession();
    void context.cancelAuth();
    onCancel();
  }, [endSession, context, onCancel]);

  const host = hostnameOf(url || urlInput);

  // Live sign-in steps use the full-width activity card (design 1b); the
  // form-sized steps use the rail + stage layout.
  if (
    step === 'signing-in' ||
    step === 'takeover' ||
    step === 'signin' ||
    step === 'signed-in'
  ) {
    const isManual = step === 'signin'; // SSO / passkey — no automated run
    const success = step === 'signed-in';
    const variant: LiveSigninVariant =
      step === 'signing-in' ? 'ai' : step === 'signin' ? 'finish' : takeoverVariant;
    return (
      <ConnectLiveSignin
        host={host}
        liveViewUrl={
          isManual
            ? context.liveViewUrl
            : (signinLiveView?.liveViewUrl ?? context.liveViewUrl)
        }
        variant={variant}
        success={success}
        steps={signinSteps}
        onConfirm={
          step === 'signing-in' || success
            ? undefined
            : isManual
              ? () => context.checkAuth(url)
              : handleTakeoverVerify
        }
        isConfirming={isManual ? context.status === 'checking' : isVerifying}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-1 sm:grid-cols-[250px_1fr]">
        <ConnectFlowRail
          title={step === 'enter-url' ? 'Connect a vendor login' : host}
          subtitle={railSubtitleFor(step)}
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
          onCancel={handleCancel}
          onConnected={() => onConnected(connectedUrl ?? url)}
          onRetry={() => setStep('enter-url')}
        />
      </div>
    </div>
  );
}
