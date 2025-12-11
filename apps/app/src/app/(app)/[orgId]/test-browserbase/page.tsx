import { TestBrowserbaseClient } from './components/TestBrowserbaseClient';

export default async function TestBrowserbasePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-2xl font-semibold">Browserbase GitHub Auth POC</h1>
      <TestBrowserbaseClient organizationId={orgId} />
    </div>
  );
}
