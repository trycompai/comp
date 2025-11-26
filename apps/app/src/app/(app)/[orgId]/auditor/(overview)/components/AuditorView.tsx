'use client';

import type { generateAuditorContentTask } from '@/jobs/tasks/auditor/generate-auditor-content';
import { Button } from '@comp/ui/button';
import { Textarea } from '@comp/ui/textarea';
import { TriggerAuthContext, useRealtimeRun } from '@trigger.dev/react-hooks';
import { CheckCircle2, Edit2, Loader2, Save, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { saveAuditorContentAction } from '../actions/save-auditor-content';
import { triggerAuditorContentAction } from '../actions/trigger-auditor-content';

// Section keys used for realtime metadata tracking
type Section =
  | 'company-background'
  | 'services'
  | 'mission-vision'
  | 'system-description'
  | 'critical-vendors'
  | 'subservice-organizations';

interface SectionConfig {
  title: string; // Also used as the Context question
  section: Section; // Used for realtime metadata tracking
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
  initialContent: Record<string, string>; // Keyed by question (title)
}

export function AuditorView({ orgId, initialContent }: AuditorViewProps) {
  const [runId, setRunId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [savedContent, setSavedContent] = useState<Record<string, string>>(initialContent);

  const { execute: triggerGenerate } = useAction(triggerAuditorContentAction, {
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
    triggerGenerate({ orgId });
  };

  const handleContentUpdate = (question: string, content: string) => {
    setSavedContent((prev) => ({
      ...prev,
      [question]: content,
    }));
  };

  // If we have a run in progress, show the realtime tracker
  if (runId && accessToken) {
    return (
      <TriggerAuthContext.Provider value={{ accessToken }}>
        <AuditorRealtimeView
          orgId={orgId}
          runId={runId}
          onComplete={(newContent) => {
            setIsTriggering(false);
            // Merge new content with saved content
            setSavedContent((prev) => ({ ...prev, ...newContent }));
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ title, section }) => (
          <AuditorSectionEditable
            key={section}
            orgId={orgId}
            title={title}
            content={savedContent[title] || ''}
            onContentUpdate={handleContentUpdate}
          />
        ))}
      </div>
    </div>
  );
}

interface AuditorSectionEditableProps {
  orgId: string;
  title: string;
  content: string;
  onContentUpdate: (question: string, content: string) => void;
}

function AuditorSectionEditable({
  orgId,
  title,
  content,
  onContentUpdate,
}: AuditorSectionEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);

  const { execute: saveContent } = useAction(saveAuditorContentAction, {
    onSuccess: (result) => {
      if (result.data?.success) {
        onContentUpdate(title, editContent);
        setIsEditing(false);
        toast.success('Content saved');
      } else {
        toast.error('Failed to save content');
      }
      setIsSaving(false);
    },
    onError: () => {
      toast.error('Failed to save content');
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    saveContent({
      orgId,
      question: title, // Use the title as the Context question
      content: editContent,
    });
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditContent(content);
    setIsEditing(true);
  };

  return (
    <section className="rounded-xs border p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {!isEditing && content && (
          <Button variant="ghost" size="sm" onClick={handleStartEdit} className="h-8 w-8 p-0">
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[150px] text-sm"
              placeholder="Enter content..."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : content ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">No content yet</p>
            <Button variant="outline" size="sm" onClick={handleStartEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              Add content
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

interface AuditorRealtimeViewProps {
  orgId: string;
  runId: string;
  onComplete: (content: Record<string, string>) => void;
  onReset: () => void;
}

function AuditorRealtimeView({ runId, onComplete, onReset }: AuditorRealtimeViewProps) {
  const { run, error } = useRealtimeRun<typeof generateAuditorContentTask>(runId, {
    onComplete: () => {
      // Extract content from metadata - keyed by title (question)
      const meta = run?.metadata as Record<string, unknown> | undefined;
      const newContent: Record<string, string> = {};

      for (const { title, section } of sections) {
        const content = meta?.[`section_${section}_content`] as string | null;
        if (content) {
          newContent[title] = content;
        }
      }

      onComplete(newContent);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ title, section }) => (
          <AuditorSectionRealtime key={section} title={title} section={section} metadata={meta} />
        ))}
      </div>
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
        return <CheckCircle2 className="h-4 w-4 text-chart-positive shrink-0" />;
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />;
      case 'error':
        return <span className="text-destructive text-sm shrink-0">✕</span>;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />;
    }
  };

  return (
    <section className="rounded-xs border p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        {getStatusIcon()}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>

      <div className="flex-1">
        {sectionError ? (
          <p className="text-sm text-destructive">Error: {sectionError}</p>
        ) : sectionContent &&
          typeof sectionContent === 'string' &&
          sectionContent.trim().length > 0 ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{sectionContent}</p>
        ) : sectionStatus === 'generating' ? (
          <p className="text-sm text-muted-foreground">Generating content...</p>
        ) : (
          <p className="text-sm text-muted-foreground">[Placeholder: content will be generated here]</p>
        )}
      </div>
    </section>
  );
}
