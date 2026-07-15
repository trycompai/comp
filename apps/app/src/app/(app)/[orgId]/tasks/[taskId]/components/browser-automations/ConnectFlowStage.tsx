'use client';

import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@trycompai/design-system';
import type { LoginAnalysis } from '../../hooks/types';
import type { Step } from './connect-flow-constants';
import { stripScheme } from './connect-url';
import { ConnectCaptureForm, type ConnectCaptureFormData } from './ConnectCaptureForm';
import { ConnectLiveSignin } from './ConnectLiveSignin';
import { ConnectMethodChooser, type ConnectMethodKind } from './ConnectMethodChooser';

interface ConnectFlowStageProps {
  step: Step;
  host: string;
  analysis: LoginAnalysis | null;
  urlInput: string;
  onUrlInputChange: (raw: string) => void;
  onAnalyze: () => void;
  isStarting: boolean;
  onChoose: (kind: ConnectMethodKind) => void;
  onCapture: (data: ConnectCaptureFormData) => void;
  isStartingSignin: boolean;
  liveViewUrl: string | null;
  isCheckingLive: boolean;
  onCheckLive: () => void;
  onCancel: () => void;
  onConnected: () => void;
  onRetry: () => void;
}

/** The right-hand panel of the connect flow — renders the view for each step. */
export function ConnectFlowStage({
  step,
  host,
  analysis,
  urlInput,
  onUrlInputChange,
  onAnalyze,
  isStarting,
  onChoose,
  onCapture,
  isStartingSignin,
  liveViewUrl,
  isCheckingLive,
  onCheckLive,
  onCancel,
  onConnected,
  onRetry,
}: ConnectFlowStageProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center p-8">
      {step === 'enter-url' && (
        <div className="flex w-full max-w-sm flex-col gap-2.5">
          <div className="text-sm text-foreground">Vendor website</div>
          <InputGroup>
            <InputGroupAddon>https://</InputGroupAddon>
            <InputGroupInput
              value={urlInput}
              onChange={(e) => onUrlInputChange(stripScheme(e.target.value))}
              placeholder="notion.so"
            />
          </InputGroup>
          <div className="text-xs text-muted-foreground">
            Just the website is enough — we&apos;ll find the sign-in page for you.
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Button
              onClick={onAnalyze}
              loading={isStarting}
              disabled={isStarting || !urlInput.trim()}
            >
              Continue
            </Button>
            <Button variant="ghost" onClick={onCancel}>
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

      {step === 'choose' && analysis && (
        <ConnectMethodChooser
          analysis={analysis}
          onChoose={onChoose}
          onCancel={onCancel}
        />
      )}

      {step === 'capture' && (
        <ConnectCaptureForm
          isSubmitting={isStartingSignin}
          onSubmit={onCapture}
          initialExtraFields={analysis?.extraFields}
          submitLabel="Sign in for me"
        />
      )}

      {step === 'signing-in' && (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3 text-sm text-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
            Signing in to {host} for you
          </div>
          <div className="text-xs text-muted-foreground">
            Entering your details and handling two-factor. If anything needs you,
            we&apos;ll hand you the browser to finish.
          </div>
          <div className="mt-1">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === 'signin' && (
        <ConnectLiveSignin
          host={host}
          liveViewUrl={liveViewUrl}
          isChecking={isCheckingLive}
          onCheck={onCheckLive}
          onCancel={onCancel}
        />
      )}

      {step === 'connected' && (
        <div className="flex w-full max-w-md flex-col gap-3 text-center">
          <div className="text-base text-foreground">{host} is connected</div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            The scheduler now signs in on its own. If a human is ever needed, we&apos;ll
            email you — runs pause, never fail silently.
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
            <Button onClick={onRetry}>Try Again</Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
