import { db } from '@db';
import { PlatformIntegrations } from './components/PlatformIntegrations';

export default async function IntegrationsPage() {
  // Fetch task templates server-side
  const taskTemplates = await db.frameworkEditorTaskTemplate.findMany({
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <span className="text-2xl text-muted-foreground/40 font-light">∞</span>
        </div>
        <p className="text-muted-foreground text-base leading-relaxed">
          Connect your tools to automate compliance checks and evidence collection.
        </p>
      </div>

      {/* Unified Integrations List */}
      <PlatformIntegrations taskTemplates={taskTemplates} />
    </div>
  );
}
