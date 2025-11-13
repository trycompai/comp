import { db } from '@db';
import { IntegrationsGrid } from './components/IntegrationsGrid';

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
    <div className="container mx-auto p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
            <span className="text-2xl text-muted-foreground/40 font-light">∞</span>
          </div>
          <p className="text-muted-foreground text-base leading-relaxed">
            Connect to any system through the AI agent. This directory shows common patterns—the
            agent can integrate with anything that has an API or web interface.
          </p>
        </div>

        {/* Integrations Grid */}
        <IntegrationsGrid taskTemplates={taskTemplates} />
      </div>
    </div>
  );
}
