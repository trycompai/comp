'use client';

import { PolicyEditor } from '@/components/editor/policy-editor';
import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui/card';

import { DiffViewer } from '@comp/ui/diff-viewer';
import { validateAndFixTipTapContent } from '@comp/ui/editor';
import '@comp/ui/editor.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import type { PolicyDisplayFormat } from '@db';
import type { JSONContent } from '@tiptap/react';
import { structuredPatch } from 'diff';
import { CheckCircle, Loader2, Sparkles, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { switchPolicyDisplayFormatAction } from '../../actions/switch-policy-display-format';
import { PdfViewer } from '../../components/PdfViewer';
import { updatePolicy } from '../actions/update-policy';
import { markdownToTipTapJSON } from './ai/markdown-utils';
import { PolicyAiAssistant } from './ai/policy-ai-assistant';

interface PolicyContentManagerProps {
  policyId: string;
  policyContent: JSONContent | JSONContent[];
  isPendingApproval: boolean;
  displayFormat?: PolicyDisplayFormat;
  pdfUrl?: string | null;
}

export function PolicyContentManager({
  policyId,
  policyContent,
  isPendingApproval,
  displayFormat = 'EDITOR',
  pdfUrl,
}: PolicyContentManagerProps) {
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [currentContent, setCurrentContent] = useState<Array<JSONContent>>(() => {
    const formattedContent = Array.isArray(policyContent)
      ? policyContent
      : [policyContent as JSONContent];
    return formattedContent;
  });

  const [proposedPolicyMarkdown, setProposedPolicyMarkdown] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const isAiPolicyAssistantEnabled = useFeatureFlagEnabled('is-ai-policy-assistant-enabled');

  const switchFormat = useAction(switchPolicyDisplayFormatAction, {
    onError: () => toast.error('Failed to switch view.'),
  });

  const currentPolicyMarkdown = useMemo(
    () => convertContentToMarkdown(currentContent),
    [currentContent],
  );

  const diffPatch = useMemo(() => {
    if (!proposedPolicyMarkdown) return null;
    return createGitPatch('Proposed Changes', currentPolicyMarkdown, proposedPolicyMarkdown);
  }, [currentPolicyMarkdown, proposedPolicyMarkdown]);

  async function applyProposedChanges() {
    if (!proposedPolicyMarkdown) return;

    setIsApplying(true);
    try {
      const jsonContent = markdownToTipTapJSON(proposedPolicyMarkdown);
      await updatePolicy({ policyId, content: jsonContent });
      setCurrentContent(jsonContent);
      setEditorKey((prev) => prev + 1);
      setProposedPolicyMarkdown(null);
      toast.success('Policy updated with AI suggestions');
    } catch (err) {
      console.error('Failed to apply changes:', err);
      toast.error('Failed to apply changes');
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <Tabs
                defaultValue={displayFormat}
                onValueChange={(format) =>
                  switchFormat.execute({ policyId, format: format as 'EDITOR' | 'PDF' })
                }
                className="w-full"
              >
                <div className="flex items-center justify-between mb-2">
                  <TabsList className="grid w-auto grid-cols-2">
                    <TabsTrigger value="EDITOR" disabled={isPendingApproval}>
                      Editor View
                    </TabsTrigger>
                    <TabsTrigger value="PDF" disabled={isPendingApproval}>
                      PDF View
                    </TabsTrigger>
                  </TabsList>
                  {!isPendingApproval &&
                    displayFormat === 'EDITOR' &&
                    isAiPolicyAssistantEnabled && (
                      <Button
                        variant={showAiAssistant ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowAiAssistant((prev) => !prev)}
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        AI Assistant
                      </Button>
                    )}
                </div>
                <TabsContent value="EDITOR" className="mt-4">
                  <PolicyEditorWrapper
                    key={editorKey}
                    policyId={policyId}
                    policyContent={currentContent}
                    isPendingApproval={isPendingApproval}
                    onContentChange={setCurrentContent}
                  />
                </TabsContent>
                <TabsContent value="PDF" className="mt-4">
                  <PdfViewer
                    policyId={policyId}
                    pdfUrl={pdfUrl}
                    isPendingApproval={isPendingApproval}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {showAiAssistant && isAiPolicyAssistantEnabled && (
              <div className="w-80 shrink-0 min-h-[400px] self-stretch flex flex-col">
                <PolicyAiAssistant
                  policyId={policyId}
                  onProposedPolicyChange={setProposedPolicyMarkdown}
                  close={() => setShowAiAssistant(false)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {proposedPolicyMarkdown && diffPatch && (
        <div className="space-y-2">
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setProposedPolicyMarkdown(null)}>
              <X className="h-3 w-3 mr-1" />
              Dismiss
            </Button>
            <Button size="sm" onClick={applyProposedChanges} disabled={isApplying}>
              {isApplying ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              Apply Changes
            </Button>
          </div>
          <DiffViewer patch={diffPatch} />
        </div>
      )}
    </div>
  );
}

function createGitPatch(fileName: string, oldStr: string, newStr: string): string {
  const patch = structuredPatch(fileName, fileName, oldStr, newStr);
  const lines: string[] = [
    `diff --git a/${fileName} b/${fileName}`,
    `--- a/${fileName}`,
    `+++ b/${fileName}`,
  ];

  for (const hunk of patch.hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
    for (const line of hunk.lines) {
      lines.push(line);
    }
  }

  return lines.join('\n');
}

function convertContentToMarkdown(content: Array<JSONContent>): string {
  function extractText(node: JSONContent): string {
    if (node.type === 'text' && typeof node.text === 'string') {
      return node.text;
    }

    if (Array.isArray(node.content)) {
      const texts = node.content.map(extractText).filter(Boolean);

      switch (node.type) {
        case 'heading': {
          const level = (node.attrs as Record<string, unknown>)?.level || 1;
          return '\n' + '#'.repeat(Number(level)) + ' ' + texts.join('') + '\n';
        }
        case 'paragraph':
          return texts.join('') + '\n';
        case 'bulletList':
        case 'orderedList':
          return '\n' + texts.join('');
        case 'listItem':
          return '- ' + texts.join('') + '\n';
        case 'blockquote':
          return '\n> ' + texts.join('\n> ') + '\n';
        default:
          return texts.join('');
      }
    }

    return '';
  }

  return content.map(extractText).join('\n').trim();
}

function PolicyEditorWrapper({
  policyId,
  policyContent,
  isPendingApproval,
  onContentChange,
}: {
  policyId: string;
  policyContent: JSONContent | Array<JSONContent>;
  isPendingApproval: boolean;
  onContentChange?: (content: Array<JSONContent>) => void;
}) {
  const formattedContent = Array.isArray(policyContent)
    ? policyContent
    : [policyContent as JSONContent];
  const sanitizedContent = formattedContent.map((node) => {
    if (node.marks) node.marks = node.marks.filter((mark) => mark.type !== 'textStyle');
    if (node.content) node.content = node.content.map((child) => child);
    return node;
  });
  const validatedDoc = validateAndFixTipTapContent(sanitizedContent);
  const normalizedContent = (validatedDoc.content || []) as Array<JSONContent>;

  async function savePolicy(content: Array<JSONContent>): Promise<void> {
    if (!policyId) return;

    try {
      await updatePolicy({ policyId, content });
      onContentChange?.(content);
    } catch (error) {
      console.error('Error saving policy:', error);
      throw error;
    }
  }

  return (
    <div className="flex h-full flex-col border border-border rounded-md p-2">
      <PolicyEditor content={normalizedContent} onSave={savePolicy} readOnly={isPendingApproval} />
    </div>
  );
}
