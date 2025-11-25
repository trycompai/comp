'use client';

import { PolicyEditor } from '@/components/editor/policy-editor';
import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui/card';
import { validateAndFixTipTapContent } from '@comp/ui/editor';
import '@comp/ui/editor.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import type { PolicyDisplayFormat } from '@db';
import type { JSONContent } from '@tiptap/react';
import { Bot } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PdfViewer } from '../../components/PdfViewer';
import { switchPolicyDisplayFormatAction } from '../../actions/switch-policy-display-format';
import { updatePolicy } from '../actions/update-policy';
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
    const formattedContent = Array.isArray(policyContent) ? policyContent : [policyContent as JSONContent];
    return formattedContent;
  });

  const switchFormat = useAction(switchPolicyDisplayFormatAction, {
    onSuccess: () => toast.info('View mode switched.'),
    onError: () => toast.error('Failed to switch view.'),
  });

  function handleTabChange(newFormat: string) {
    switchFormat.execute({
      policyId,
      format: newFormat as 'EDITOR' | 'PDF',
    });
  }

  function toggleAiAssistant() {
    setShowAiAssistant(!showAiAssistant);
  }

  function closeAiAssistant() {
    setShowAiAssistant(false);
  }

  const applyAiChanges = useCallback(async (content: Array<JSONContent>) => {
    try {
      await updatePolicy({ policyId, content });
      setCurrentContent(content);
      setEditorKey((prev) => prev + 1);
      toast.success('Policy updated with AI suggestions');
    } catch (error) {
      console.error('Failed to apply AI changes:', error);
      toast.error('Failed to apply changes');
      throw error;
    }
  }, [policyId]);

  const currentPolicyMarkdown = convertContentToMarkdown(currentContent);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className={`flex-1 ${showAiAssistant ? 'w-2/3' : 'w-full'}`}>
            <Tabs
              defaultValue={displayFormat}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-2">
                <TabsList className="grid w-auto grid-cols-2">
                  <TabsTrigger value="EDITOR" disabled={isPendingApproval}>Editor View</TabsTrigger>
                  <TabsTrigger value="PDF" disabled={isPendingApproval}>PDF View</TabsTrigger>
                </TabsList>
                {!isPendingApproval && displayFormat === 'EDITOR' && (
                  <Button
                    variant={showAiAssistant ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleAiAssistant}
                    className="gap-2"
                  >
                    <Bot className="h-4 w-4" />
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
          {showAiAssistant && (
            <div className="w-1/3 min-w-[320px] max-w-[400px] h-[600px]">
              <PolicyAiAssistant
                policyId={policyId}
                currentPolicyMarkdown={currentPolicyMarkdown}
                applyChanges={applyAiChanges}
                close={closeAiAssistant}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
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
  const formattedContent = Array.isArray(policyContent) ? policyContent : [policyContent as JSONContent];
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
      <PolicyEditor
        content={normalizedContent}
        onSave={savePolicy}
        readOnly={isPendingApproval}
      />
    </div>
  );
}
