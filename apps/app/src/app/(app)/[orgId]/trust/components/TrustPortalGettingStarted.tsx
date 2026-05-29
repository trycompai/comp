import { Alert, AlertDescription, AlertTitle } from '@trycompai/design-system';
import Link from 'next/link';

const STEPS = [
  'Enable the frameworks you’re working toward to show prospects and vendors your compliance progress — no certificate needed yet.',
  'Your published policies show automatically — drafts and in-progress updates stay private.',
  'Add a custom domain and contact email to make it your own.',
];

export function TrustPortalGettingStarted({ portalUrl }: { portalUrl: string }) {
  return (
    <Alert variant="info">
      <AlertTitle>
        <span className="text-foreground">Finish setting up your Trust Portal</span>
      </AlertTitle>
      <AlertDescription>
        <span className="text-foreground">
          Your Trust Portal is at{' '}
          <Link href={portalUrl} target="_blank" rel="noopener noreferrer">
            {portalUrl}
          </Link>
          . Put it to work so prospects and vendors can see where you stand:
        </span>
      </AlertDescription>
      {/* variant="info" renders an icon, so Alert is a 2-col grid; place the
          list in the text column like the title/description slots above. */}
      <ul className="col-start-2 flex list-disc flex-col gap-1 pl-5 text-sm text-foreground">
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </Alert>
  );
}
