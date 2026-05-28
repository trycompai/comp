'use client';

import { usePermissions } from '@/hooks/use-permissions';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
} from '@trycompai/design-system';
import { Close } from '@trycompai/design-system/icons';
import Link from 'next/link';
import type { NudgeState, ServerNudgeData } from './types';

export function useTrustPortalSetupNudge({
  orgId,
  server,
}: {
  orgId: string;
  server: ServerNudgeData;
}): NudgeState {
  const { hasPermission } = usePermissions();
  const canSetup = hasPermission('trust', 'update');
  const { isTrustNdaEnabled, isConfigured } = server.trust;

  return {
    id: 'trust-portal-setup',
    priority: 20,
    persistDismissal: true,
    ready: true, // server data already resolved
    eligible: isTrustNdaEnabled && !isConfigured && canSetup,
    render: (onDismiss) => (
      <TrustPortalSetupNudgeView orgId={orgId} onDismiss={onDismiss} />
    ),
  };
}

function TrustPortalSetupNudgeView({
  orgId,
  onDismiss,
}: {
  orgId: string;
  onDismiss: () => void;
}) {
  return (
    <Alert variant="info">
      <div className="col-start-2 flex flex-col items-start gap-2">
        <AlertTitle>Showcase your security posture</AlertTitle>
        <AlertDescription>
          Set up your Trust Portal to share your certifications, policies, and
          security documents with prospects in one place.
        </AlertDescription>
        <Button>
          <Link href={`/${orgId}/trust`}>Set it up</Link>
        </Button>
      </div>
      <AlertAction>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 text-blue-600 transition-colors hover:text-blue-800"
        >
          <Close size={16} />
        </button>
      </AlertAction>
    </Alert>
  );
}
