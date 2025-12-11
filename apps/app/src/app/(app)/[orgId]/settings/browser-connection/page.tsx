import type { Metadata } from 'next';
import { BrowserConnectionClient } from './components/BrowserConnectionClient';

export const metadata: Metadata = {
  title: 'Browser Connection',
};

export default async function BrowserConnectionPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Browser Connection</h2>
        <p className="text-sm text-muted-foreground">
          Connect a browser session to enable automated screenshots and evidence collection from
          authenticated web pages.
        </p>
      </div>
      <BrowserConnectionClient organizationId={orgId} />
    </div>
  );
}
