'use client';

import { apiClient } from '@/lib/api-client';
import { Alert, Button, Heading, Text } from '@trycompai/design-system';
import { useState } from 'react';

export interface PendingConsent {
  clientName: string;
  redirectUri: string;
}

const BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

function getRedirectTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    return BLOCKED_PROTOCOLS.includes(new URL(value).protocol) ? null : value;
  } catch {
    return null;
  }
}

function getDestination(uri: string): string {
  try {
    const url = new URL(uri);
    return url.host || url.protocol;
  } catch {
    return uri;
  }
}

export function ConsentForm({
  consentCode,
  consent,
}: {
  consentCode: string;
  consent: PendingConsent;
}) {
  const [pending, setPending] = useState<'allow' | 'deny' | null>(null);
  const [failed, setFailed] = useState(false);

  const handleDecision = async (accept: boolean) => {
    setFailed(false);
    setPending(accept ? 'allow' : 'deny');
    const response = await apiClient.post<{ redirectURI?: string }>('/api/auth/oauth2/consent', {
      accept,
      consent_code: consentCode,
    });
    const target = getRedirectTarget(response.data?.redirectURI);
    if (!target) {
      setPending(null);
      setFailed(true);
      return;
    }
    window.location.assign(target);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-6 sm:p-8">
        <div className="space-y-2">
          <Heading level="2">{`Allow ${consent.clientName} to access your account?`}</Heading>
          <Text size="sm" variant="muted">
            {
              'If you allow access, this app can read and change your Comp AI data with your permissions.'
            }
          </Text>
        </div>
        <div className="space-y-1 rounded-md border p-4">
          <Text size="sm" variant="muted">
            {'Access will be sent to'}
          </Text>
          <Text weight="medium">{getDestination(consent.redirectUri)}</Text>
          <div className="break-all">
            <Text size="xs" variant="muted">
              {consent.redirectUri}
            </Text>
          </div>
        </div>
        {failed && (
          <Alert
            variant="destructive"
            description="This request could not be completed. Start again from the app you were connecting."
          />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => void handleDecision(false)}
            disabled={pending !== null}
            loading={pending === 'deny'}
          >
            {'Deny'}
          </Button>
          <Button
            onClick={() => void handleDecision(true)}
            disabled={pending !== null}
            loading={pending === 'allow'}
          >
            {'Allow'}
          </Button>
        </div>
      </div>
    </div>
  );
}
