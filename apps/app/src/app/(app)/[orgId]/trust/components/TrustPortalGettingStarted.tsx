import { Alert, AlertDescription, AlertTitle } from '@trycompai/design-system';
import Link from 'next/link';

const STEPS = [
  'Connect a custom domain so the portal lives on your brand.',
  'Add your compliance certifications (SOC 2, ISO 27001, …).',
  'Upload supporting documents and policies.',
  'Add FAQs and a contact email for prospects.',
];

export function TrustPortalGettingStarted({ portalUrl }: { portalUrl: string }) {
  return (
    <Alert variant="info">
      <AlertTitle>
        <span className="text-foreground">Finish setting up your Trust Portal</span>
      </AlertTitle>
      <AlertDescription>
        <span className="text-foreground">
          Your Trust Portal is already live at{' '}
          <Link href={portalUrl} target="_blank" rel="noopener noreferrer">
            {portalUrl}
          </Link>
          , but it&apos;s still on the defaults. Complete these to make it yours:
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
