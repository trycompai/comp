import { serverApi } from '@/lib/api-server';
import { Alert, Heading } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { ConsentForm, type PendingConsent } from './components/ConsentForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Authorize access | Comp AI',
  robots: { index: false, follow: false },
};

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ consent_code?: string | string[] }>;
}) {
  const { consent_code: consentCode } = await searchParams;
  const response =
    typeof consentCode === 'string' && consentCode
      ? await serverApi.get<PendingConsent>(
          `/v1/auth/oauth-consent?consent_code=${encodeURIComponent(consentCode)}`,
        )
      : null;

  if (typeof consentCode !== 'string' || !response?.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border p-6 sm:p-8">
          <Heading level="2">{'This request is no longer valid'}</Heading>
          <Alert
            variant="warning"
            description="Close this tab and start again from the app you were connecting."
          />
        </div>
      </div>
    );
  }

  return <ConsentForm consentCode={consentCode} consent={response.data} />;
}
