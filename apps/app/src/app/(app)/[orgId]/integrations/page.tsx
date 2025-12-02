import { db } from '@db';
import { IntegrationsGrid } from './components/IntegrationsGrid';
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
    <div className="mx-auto max-w-7xl space-y-10 py-8">
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

      {/* Pre-built Platform Integrations */}
      <PlatformIntegrations />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-sm text-muted-foreground">
            Or use the AI agent for any integration
          </span>
        </div>
      </div>

      {/* AI Agent Integrations */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">AI Agent Integrations</h2>
          <p className="text-sm text-muted-foreground">
            The AI agent can connect to any system with an API. These are common examples—describe
            what you need and the agent will figure out the rest.
          </p>
        </div>
        <IntegrationsGrid taskTemplates={taskTemplates} />
      </div>
    </div>
  );
}
