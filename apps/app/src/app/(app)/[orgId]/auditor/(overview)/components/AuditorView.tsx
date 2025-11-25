'use client';

import type { generateAuditorContentTask } from '@/jobs/tasks/auditor/generate-auditor-content';
import { Button } from '@comp/ui/button';
import { TriggerAuthContext, useRealtimeRun } from '@trigger.dev/react-hooks';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { triggerAuditorContentAction } from '../actions/trigger-auditor-content';

type Section =
  | 'company-background'
  | 'services'
  | 'mission-vision'
  | 'system-description'
  | 'critical-vendors'
  | 'subservice-organizations';

interface SectionConfig {
  title: string;
  section: Section;
}

const sections: SectionConfig[] = [
  {
    title: 'Company Background & Overview of Operations',
    section: 'company-background',
  },
  {
    title: 'Types of Services Provided',
    section: 'services',
  },
  {
    title: 'Mission & Vision',
    section: 'mission-vision',
  },
  {
    title: 'System Description',
    section: 'system-description',
  },
  {
    title: 'Critical Vendors',
    section: 'critical-vendors',
  },
  {
    title: 'Subservice Organizations',
    section: 'subservice-organizations',
  },
];

interface AuditorViewProps {
  orgId: string;
}

export function AuditorView({ orgId }: AuditorViewProps) {
  const [runId, setRunId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  const { execute } = useAction(triggerAuditorContentAction, {
    onSuccess: (result) => {
      if (result.data?.success && result.data.runId && result.data.accessToken) {
        setRunId(result.data.runId);
        setAccessToken(result.data.accessToken);
        toast.success('Generation started');
      } else {
        toast.error(result.data?.error || 'Failed to start generation');
        setIsTriggering(false);
      }
    },
    onError: (result) => {
      toast.error(result.error.serverError || 'Something went wrong');
      setIsTriggering(false);
    },
  });

  const handleGenerate = () => {
    setIsTriggering(true);
    execute({ orgId });
  };

  // If we have a run in progress, show the realtime tracker
  if (runId && accessToken) {
    return (
      <TriggerAuthContext.Provider value={{ accessToken }}>
        <AuditorRealtimeView
          runId={runId}
          onComplete={() => {
            setIsTriggering(false);
          }}
          onReset={() => {
            setRunId(null);
            setAccessToken(null);
            setIsTriggering(false);
          }}
        />
      </TriggerAuthContext.Provider>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={isTriggering} size="default" variant="default">
          {isTriggering ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            'Generate All Sections'
          )}
        </Button>
      </div>

      {sections.map(({ title, section }) => (
        <AuditorSectionPlaceholder key={section} title={title} />
      ))}
    </div>
  );
}

function AuditorSectionPlaceholder({ title }: { title: string }) {
  return (
    <section className="rounded-xs border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        [Placeholder: {title.toLowerCase()} will be displayed here]
      </p>
    </section>
  );
}

interface AuditorRealtimeViewProps {
  runId: string;
  onComplete: () => void;
  onReset: () => void;
}

function AuditorRealtimeView({ runId, onComplete, onReset }: AuditorRealtimeViewProps) {
  const { run, error } = useRealtimeRun<typeof generateAuditorContentTask>(runId, {
    onComplete: () => {
      onComplete();
      toast.success('All sections generated successfully');
    },
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-destructive">Error: {error.message}</p>
          <Button variant="outline" onClick={onReset}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const meta = run?.metadata as Record<string, unknown> | undefined;
  const status = (meta?.status as string) || 'initializing';
  const completedSections = (meta?.completedSections as number) || 0;
  const totalSections = (meta?.totalSections as number) || 6;
  const isCompleted = run?.status === 'COMPLETED';
  const isFailed = run?.status === 'FAILED';

  const getStatusMessage = () => {
    if (isFailed) return 'Generation failed';
    if (isCompleted) return 'Generation complete';
    switch (status) {
      case 'initializing':
        return 'Initializing...';
      case 'fetching-context':
        return 'Fetching organization context...';
      case 'scraping-website':
        return 'Researching company website...';
      case 'generating':
        return `Generating sections (${completedSections}/${totalSections})...`;
      case 'completed':
        return 'Generation complete';
      case 'error':
        return 'Generation failed';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-chart-positive" />
          ) : isFailed ? (
            <span className="text-destructive">✕</span>
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          <span className="text-sm font-medium">{getStatusMessage()}</span>
        </div>
        {(isCompleted || isFailed) && (
          <Button variant="outline" onClick={onReset}>
            Generate Again
          </Button>
        )}
      </div>

      {sections.map(({ title, section }) => (
        <AuditorSectionRealtime key={section} title={title} section={section} metadata={meta} />
      ))}
    </div>
  );
}

interface AuditorSectionRealtimeProps {
  title: string;
  section: Section;
  metadata: Record<string, unknown> | undefined;
}

function AuditorSectionRealtime({ title, section, metadata }: AuditorSectionRealtimeProps) {
  const sectionStatus = (metadata?.[`section_${section}_status`] as string) || 'pending';
  const sectionContent = metadata?.[`section_${section}_content`] as string | null;
  const sectionError = metadata?.[`section_${section}_error`] as string | null;

  const getStatusIcon = () => {
    switch (sectionStatus) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-chart-positive" />;
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'error':
        return <span className="text-destructive text-sm">✕</span>;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <section className="rounded-xs border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>

      {sectionError ? (
        <p className="text-sm text-destructive">Error: {sectionError}</p>
      ) : sectionContent &&
        typeof sectionContent === 'string' &&
        sectionContent.trim().length > 0 ? (
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-sm">{sectionContent}</p>
        </div>
      ) : sectionStatus === 'generating' ? (
        <p className="text-sm text-muted-foreground">Generating content...</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          [Placeholder: {title.toLowerCase()} will be displayed here]
        </p>
      )}
    </section>
  );
}
