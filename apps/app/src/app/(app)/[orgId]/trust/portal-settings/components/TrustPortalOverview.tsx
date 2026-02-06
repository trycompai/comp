'use client';

import { api } from '@/lib/api-client';
import { Button, Input, Textarea } from '@trycompai/design-system';
import { View, ViewOff } from '@trycompai/design-system/icons';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TrustPortalOverviewProps {
  initialData: {
    overviewTitle: string | null;
    overviewContent: string | null;
    showOverview: boolean;
  };
  orgId: string;
}

export function TrustPortalOverview({ initialData, orgId }: TrustPortalOverviewProps) {
  const [title, setTitle] = useState(initialData.overviewTitle ?? '');
  const [content, setContent] = useState(initialData.overviewContent ?? '');
  const [showOverview, setShowOverview] = useState(initialData.showOverview);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const saveOverview = useCallback(
    async (overrides?: { showOverview?: boolean }) => {
      setIsSaving(true);
      try {
        const response = await api.post('/v1/trust-portal/overview', {
          organizationId: orgId,
          overviewTitle: title.trim() || null,
          overviewContent: content.trim() || null,
          showOverview: overrides?.showOverview ?? showOverview,
        });
        if (response.error) throw new Error(response.error);
        setIsDirty(false);
        toast.success('Overview saved successfully');
      } catch {
        toast.error('Failed to save overview');
      } finally {
        setIsSaving(false);
      }
    },
    [orgId, title, content, showOverview],
  );

  const handleSave = () => {
    saveOverview();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setIsDirty(true);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setIsDirty(true);
  };

  const handleToggleChange = (checked: boolean) => {
    setShowOverview(checked);
    // Auto-save visibility toggle immediately
    saveOverview({ showOverview: checked });
  };

  return (
    <div className="space-y-6">
      {/* Visibility Toggle */}
      <div className="flex justify-start">
        <div className="inline-flex rounded-md overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => handleToggleChange(true)}
            className={`flex items-center gap-1 px-2 py-1 font-medium transition-colors cursor-pointer ${
              showOverview
                ? 'bg-primary/10 text-primary dark:brightness-175'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <View size={12} />
            Visible
          </button>
          <button
            type="button"
            onClick={() => handleToggleChange(false)}
            className={`flex items-center gap-1 px-2 py-1 font-medium transition-colors cursor-pointer ${
              !showOverview
                ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <ViewOff size={12} />
            Hidden
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Add a mission statement or overview text to display at the top of your trust portal
          </p>
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            loading={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="overview-title" className="text-sm font-medium">
            Title
          </label>
          <Input
            id="overview-title"
            placeholder="e.g., Our Mission, Security Commitment, About Us"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            {title.length}/200 characters
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="overview-content" className="text-sm font-medium mb-2 block">
            Content
          </label>
          <Textarea
            id="overview-content"
            placeholder="Write your overview text here. You can use markdown formatting and include links."
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={20}
            maxLength={10000}
            size="full"
          />
          <p className="text-xs text-muted-foreground">
            {content.length}/10,000 characters • Markdown supported for links, bold, italic, etc.
          </p>
        </div>

        {content && (
          <div className="space-y-2">
            <label className="text-sm font-medium mb-2 block">Preview</label>
            <div className="rounded-md border border-border bg-muted/30 p-6">
              {title && <h4 className="mb-4 text-xl font-semibold">{title}</h4>}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ children, href, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    code: ({ children, className, ...props }) => (
                      <code
                        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                    pre: ({ children, ...props }) => (
                      <pre
                        className="bg-muted p-4 rounded overflow-x-auto my-4"
                        {...props}
                      >
                        {children}
                      </pre>
                    ),
                    h1: ({ children, ...props }) => (
                      <h1 className="text-2xl font-bold mb-4 mt-6" {...props}>
                        {children}
                      </h1>
                    ),
                    h2: ({ children, ...props }) => (
                      <h2 className="text-xl font-bold mb-3 mt-5" {...props}>
                        {children}
                      </h2>
                    ),
                    h3: ({ children, ...props }) => (
                      <h3 className="text-lg font-semibold mb-2 mt-4" {...props}>
                        {children}
                      </h3>
                    ),
                    h4: ({ children, ...props }) => (
                      <h4 className="text-base font-semibold mb-2 mt-3" {...props}>
                        {children}
                      </h4>
                    ),
                    h5: ({ children, ...props }) => (
                      <h5 className="text-sm font-semibold mb-1 mt-2" {...props}>
                        {children}
                      </h5>
                    ),
                    h6: ({ children, ...props }) => (
                      <h6 className="text-xs font-semibold mb-1 mt-2" {...props}>
                        {children}
                      </h6>
                    ),
                    ul: ({ children, ...props }) => (
                      <ul className="list-disc pl-6 my-3 space-y-1" {...props}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children, ...props }) => (
                      <ol className="list-decimal pl-6 my-3 space-y-1" {...props}>
                        {children}
                      </ol>
                    ),
                    li: ({ children, ...props }) => (
                      <li className="leading-relaxed" {...props}>
                        {children}
                      </li>
                    ),
                    p: ({ children, ...props }) => (
                      <p className="mb-3 leading-relaxed" {...props}>
                        {children}
                      </p>
                    ),
                    blockquote: ({ children, ...props }) => (
                      <blockquote
                        className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground"
                        {...props}
                      >
                        {children}
                      </blockquote>
                    ),
                    input: ({ checked, ...props }) => {
                      if (props.type === 'checkbox') {
                        return (
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="mr-2 align-middle"
                            {...props}
                          />
                        );
                      }
                      return <input {...props} />;
                    },
                    strong: ({ children, ...props }) => (
                      <strong className="font-bold" {...props}>
                        {children}
                      </strong>
                    ),
                    em: ({ children, ...props }) => (
                      <em className="italic" {...props}>
                        {children}
                      </em>
                    ),
                    del: ({ children, ...props }) => (
                      <del className="line-through" {...props}>
                        {children}
                      </del>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
