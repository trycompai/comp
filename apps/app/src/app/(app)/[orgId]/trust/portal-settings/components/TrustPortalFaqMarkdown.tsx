'use client';

import { Button } from '@comp/ui/button';
import { Separator } from '@comp/ui/separator';
import { EditorContent, useEditor } from '@tiptap/react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { updateTrustPortalFaqMarkdownAction } from '../actions/update-trust-portal-faq-markdown';
import { Save, Loader2 } from 'lucide-react';
import { defaultExtensions } from '@comp/ui/editor/extensions';
import { Markdown } from 'tiptap-markdown';
import { NodeSelector } from '@comp/ui/editor/selectors/node-selector';
import { TextButtons } from '@comp/ui/editor/selectors/text-buttons';
import { LinkSelector } from '@comp/ui/editor/selectors/link-selector';

export function TrustPortalFaqMarkdown({
  initialMarkdown,
  orgId,
}: {
  initialMarkdown: string | null;
  orgId: string;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [openNode, setOpenNode] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const lastSavedMarkdownRef = useRef<string>(initialMarkdown ?? '');

  const updateFaqMarkdown = useAction(updateTrustPortalFaqMarkdownAction, {
    onSuccess: () => {
      const currentMarkdown = editor?.storage.markdown.getMarkdown() ?? '';
      lastSavedMarkdownRef.current = currentMarkdown;
      setIsDirty(false);
      toast.success('FAQ saved successfully');
    },
    onError: () => {
      toast.error('Failed to save FAQ');
    },
  });

  const editor = useEditor({
    extensions: [
      ...defaultExtensions({ 
        placeholder: '### What is your security policy?\n\nWe follow industry best practices...',
        openLinksOnClick: false 
      }),
      Markdown.configure({
        html: false, // Disable HTML in markdown for security
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: initialMarkdown ?? '',
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-4 py-3 min-h-[400px]',
      },
    },
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      const currentMarkdown = editor.storage.markdown.getMarkdown();
      const hasChanged = currentMarkdown !== lastSavedMarkdownRef.current;
      setIsDirty(hasChanged);
    },
  });

  const handleSave = useCallback(() => {
    if (!editor || !isDirty) return;
    
    const markdown = editor.storage.markdown.getMarkdown();
    updateFaqMarkdown.execute({ 
      markdown: markdown === '' ? null : markdown 
    });
  }, [editor, isDirty, updateFaqMarkdown]);

  // Keyboard shortcut for save (Cmd/Ctrl + S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const isSaving = updateFaqMarkdown.status === 'executing';
  const charCount = editor?.storage.characterCount?.characters() ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-background">
        {/* Toolbar */}
        <div className="border-b bg-muted/40 px-3 py-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              <NodeSelector open={openNode} onOpenChange={setOpenNode} editor={editor!} />
              <Separator orientation="vertical" className="h-6 shrink-0" />
              <TextButtons editor={editor!} />
              <Separator orientation="vertical" className="h-6 shrink-0" />
              <LinkSelector open={openLink} onOpenChange={setOpenLink} editor={editor!} />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground shrink-0">
                {charCount} / 50,000 characters
              </p>
              <Separator orientation="vertical" className="h-4 shrink-0" />
              <div className="text-xs text-muted-foreground shrink-0">
                {isSaving ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </span>
                ) : isDirty ? (
                  'Unsaved changes'
                ) : (
                  'Saved'
                )}
              </div>
              <Separator orientation="vertical" className="h-4 shrink-0" />
              <Button
                type="button"
                size="sm"
                variant={isDirty ? 'default' : 'outline'}
                disabled={!isDirty || isSaving}
                onClick={handleSave}
                className="gap-1 h-7 px-2 text-xs shrink-0"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
        {/* Editor */}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
