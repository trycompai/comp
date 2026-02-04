'use client';

import type { JSONContent } from '@tiptap/react';
import { useEditor, EditorContent } from '@tiptap/react';
import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { createMentionExtension, type MentionUser } from '@comp/ui/editor';
import { FileAttachment } from '@comp/ui/editor/extensions/file-attachment';
import { useDebouncedCallback } from 'use-debounce';
import { defaultExtensions } from '@comp/ui/editor/extensions';
import { Textarea } from '@comp/ui/textarea';
import { toast } from 'sonner';
import { Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@comp/ui/button';
import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';

interface TaskRichDescriptionFieldProps {
  value: JSONContent | null;
  onChange: (value: JSONContent | null) => void;
  onFileUpload: (
    files: File[],
  ) => Promise<
    { id: string; name: string; size?: number; downloadUrl?: string; type?: string }[]
  >;
  members: MentionUser[];
  disabled?: boolean;
  placeholder?: string;
  onMentionSelect?: () => void;
  onFileSelectStart?: () => void;
  onFileSelectEnd?: () => void;
  entityId: string;
  entityType: 'risk' | 'vendor';
}

export function TaskRichDescriptionField({
  value,
  onChange,
  onFileUpload,
  members,
  disabled = false,
  placeholder = 'Start typing... Mention users with @ or attach files',
  onMentionSelect,
  onFileSelectStart,
  onFileSelectEnd,
  entityId,
  entityType,
}: TaskRichDescriptionFieldProps) {
  // Hooks must be called unconditionally and in the same order
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { orgId: organizationId } = useParams<{ orgId: string }>();
  const [isUploading, setIsUploading] = useState(false);
  const isUploadingRef = useRef(false);
  
  // Add pulse animation and skeleton styles
  useEffect(() => {
    const styleId = 'file-skeleton-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .file-upload-skeleton-placeholder {
          display: flex !important;
          align-items: center;
          gap: 12px;
          padding: 12px;
          margin: 8px 0;
          min-height: 64px;
          border-radius: 6px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--muted) / 0.5);
          position: relative;
        }
        .file-upload-skeleton-placeholder::before {
          content: '';
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: hsl(var(--muted));
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          flex-shrink: 0;
        }
        .file-upload-skeleton-placeholder::after {
          content: '';
          flex: 1;
          height: 32px;
          background: 
            linear-gradient(to right, hsl(var(--muted)) 0%, hsl(var(--muted)) 60%, transparent 60%),
            linear-gradient(to right, hsl(var(--muted)) 0%, hsl(var(--muted)) 40%, transparent 40%);
          background-size: 100% 16px, 100% 12px;
          background-position: 0 0, 0 20px;
          background-repeat: no-repeat;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      // Don't remove on unmount as it might be used by other instances
    };
  }, []);

  // Search function - no debounce for empty query (show immediately)
  const searchMembers = (query: string): MentionUser[] => {
    if (!members || members.length === 0) return [];
    
    // Show first 10 members immediately when query is empty
    if (!query || query.trim() === '') {
      return members.slice(0, 10);
    }

    // Filter members based on query
    const lowerQuery = query.toLowerCase();
    return members
      .filter(
        (member) =>
          member.name.toLowerCase().includes(lowerQuery) ||
          member.email.toLowerCase().includes(lowerQuery),
      )
      .slice(0, 10);
  };

  // Debounced version for when user is typing (to avoid too many filters)
  const debouncedSearchMembers = useDebouncedCallback(searchMembers, 250);

  // Create mention extension with member search
  const mentionExtension = useMemo(
    () =>
      createMentionExtension({
        suggestion: {
          char: '@',
          items: ({ query }) => {
            // Use immediate search for empty query, debounced for typed queries
            if (!query || query.trim() === '') {
              return searchMembers(query) || [];
            }
            return debouncedSearchMembers(query) || [];
          },
          onSelect: () => {
            // Notify parent that a mention is being selected
            onMentionSelect?.();
          },
        },
      }),
    [members, searchMembers, debouncedSearchMembers, onMentionSelect],
  );

  const resolveDownloadUrl = useCallback(
    async (attachmentId: string): Promise<string | null> => {
      if (!attachmentId || !organizationId) return null;
      try {
        const response = await api.get<{ downloadUrl: string }>(
          `/v1/attachments/${attachmentId}/download`,
        );
        if (response.error || !response.data?.downloadUrl) {
          throw new Error(response.error || 'Download URL not available');
        }
        return response.data.downloadUrl;
      } catch (error) {
        console.error('Failed to refresh attachment download URL:', error);
        toast.error('Failed to refresh attachment download link');
        return null;
      }
    },
    [organizationId],
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string): Promise<void> => {
      if (!attachmentId || !organizationId) {
        throw new Error('Attachment ID or Organization ID is missing');
      }
      try {
        const response = await api.delete(
          `/v1/task-management/attachments/${attachmentId}`,
        );
        if (response.error) {
          throw new Error(response.error);
        }
      } catch (error) {
        console.error('Failed to delete attachment:', error);
        throw error; // Re-throw to let FileAttachmentView handle the error
      }
    },
    [organizationId],
  );

  // File attachment extension - no upload handler needed here, handled in drop/paste
  const fileAttachmentExtension = useMemo(
    () =>
      FileAttachment.configure({
        HTMLAttributes: {
          class: 'file-attachment-node',
        },
        getDownloadUrl: resolveDownloadUrl,
        onDelete: handleDeleteAttachment,
      }),
    [resolveDownloadUrl, handleDeleteAttachment],
  );

  // Memoize extensions array to prevent recreation
  const extensions = useMemo(
    () => [
      ...defaultExtensions({ placeholder }),
      mentionExtension,
      fileAttachmentExtension,
    ],
    [placeholder, mentionExtension, fileAttachmentExtension],
  );

  const editor = useEditor(
    {
      extensions,
      content: value || '',
      editable: !disabled,
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        // Get content immediately when editor updates
        // This is called automatically when content changes (including when we insert files)
        // Defer onChange during file uploads to avoid flushSync errors
        if (!editor.isDestroyed) {
          const content = editor.getJSON();
          if (isUploadingRef.current) {
            // During upload, defer to avoid flushSync during render
            queueMicrotask(() => {
              if (!editor.isDestroyed) {
                onChange(content);
              }
            });
          } else {
            // Normal typing - can call synchronously
          onChange(content);
          }
        }
      },
      editorProps: {
        handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files) {
          const files = Array.from(event.dataTransfer.files);
          if (files.length > 0) {
            event.preventDefault();
            
            // Get drop position - insert at drop location
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            const pos = coordinates?.pos ?? view.state.selection.anchor;
            
            // Handle async upload without blocking
            (async () => {
              setIsUploading(true);
              isUploadingRef.current = true;
              try {
                const results = await onFileUpload(files);
                if (results && results.length > 0 && editor && !editor.isDestroyed) {
                  const contentToInsert: Array<{ type: string; attrs?: Record<string, unknown> }> = [];
                  results.forEach((result, index) => {
                    const inferredType = result.type || files[index]?.type || '';
                    contentToInsert.push({
                      type: 'fileAttachment',
                      attrs: {
                        id: result.id,
                        name: result.name,
                        size: result.size || 0,
                        downloadUrl: result.downloadUrl || '',
                        uploadedAt: new Date().toISOString(),
                        type: inferredType,
                      },
                    });
                    if (index < results.length - 1) {
                      contentToInsert.push({ type: 'paragraph' });
                    }
                  });
                  contentToInsert.push({ type: 'paragraph' });
                  editor.chain().focus().setTextSelection(pos).insertContent(contentToInsert).run();
                  // Ensure onChange is called after drop insertion (defer to avoid flushSync during render)
                  queueMicrotask(() => {
                    if (!editor.isDestroyed) {
                  onChange(editor.getJSON());
                    }
                  });
                }
              } catch (error) {
                console.error('Failed to upload files:', error);
              } finally {
                setIsUploading(false);
                isUploadingRef.current = false;
              }
            })();
            
            return true;
          }
        }
        return false;
      },
        handlePaste: (view, event, _slice) => {
        const items = Array.from(event.clipboardData?.items || []);
        const files = items
          .filter((item) => item.kind === 'file')
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null);

        if (files.length > 0) {
          event.preventDefault();
          
          // Handle async upload without blocking
          (async () => {
            setIsUploading(true);
            isUploadingRef.current = true;
            try {
              const results = await onFileUpload(files);
              if (results && results.length > 0 && editor && !editor.isDestroyed) {
                const contentToInsert: Array<{ type: string; attrs?: Record<string, unknown> }> = [];
                results.forEach((result, index) => {
                  const inferredType = result.type || files[index]?.type || '';
                  contentToInsert.push({
                    type: 'fileAttachment',
                    attrs: {
                      id: result.id,
                      name: result.name,
                      size: result.size || 0,
                      downloadUrl: result.downloadUrl || '',
                      uploadedAt: new Date().toISOString(),
                      type: inferredType,
                    },
                  });
                  if (index < results.length - 1) {
                    contentToInsert.push({ type: 'paragraph' });
                  }
                });
                contentToInsert.push({ type: 'paragraph' });
                const currentPos = editor.state.selection.from;
                editor.chain().focus().setTextSelection(currentPos).insertContent(contentToInsert).run();
                // Ensure onChange is called after paste insertion (defer to avoid flushSync during render)
                queueMicrotask(() => {
                  if (!editor.isDestroyed) {
                onChange(editor.getJSON());
                  }
                });
              }
            } catch (error) {
              console.error('Failed to upload files:', error);
            } finally {
              setIsUploading(false);
              isUploadingRef.current = false;
            }
          })();
          
          return true;
        }
        return false;
      },
        attributes: {
          class:
            'prose prose-lg max-w-none focus:outline-none [&_p]:text-base [&_p]:leading-relaxed [&_li]:text-base [&_li]:leading-relaxed min-h-[150px] max-h-[300px] overflow-y-auto p-3 pb-20',
        },
        handleDOMEvents: {
          mousedown: (view, event) => {
            // Allow clicks on suggestion dropdowns to work
            const target = event.target as HTMLElement;
            if (
              target?.closest('.tippy-box') ||
              target?.closest('[role="listbox"]')
            ) {
              return true; // Let the event propagate to the dropdown
            }
            return false;
          },
        },
      },
    },
    // After hard refresh, members are fetched async; re-create the editor when they arrive
    // so mention suggestions start working without needing a navigation/remount.
    // NOTE: Do NOT include `disabled` here - it changes during upload and would destroy the editor mid-upload.
    // Instead, we update editable state via useEffect below.
    [members.length, placeholder],
  );

  // Update editable state separately to avoid recreating editor during upload
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value && !editor.isDestroyed) {
      const currentContent = editor.getJSON();
      // Only update if content actually changed
      if (JSON.stringify(currentContent) !== JSON.stringify(value)) {
        // Use setContent with emitUpdate: false to prevent infinite loops
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }
  }, [value, editor]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files ? Array.from(event.target.files) : [];
    console.log('handleFileSelect called', {
      filesCount: fileList.length,
      editorExists: !!editor,
      editorDestroyed: editor?.isDestroyed,
    });
    
    if (fileList.length > 0 && editor && !editor.isDestroyed) {
      // Notify parent that file selection started
      onFileSelectStart?.();
      setIsUploading(true);
      isUploadingRef.current = true;
      
      // Get current selection position before upload
      editor.chain().focus().run();
      const startPos = editor.state.selection.from;
      
      // Insert loading skeleton placeholders as simple paragraphs
      // We'll use CSS to style them to look like file attachment skeletons
      const skeletonPlaceholders: Array<{ type: string; attrs?: any }> = [];
      fileList.forEach(() => {
        skeletonPlaceholders.push({
          type: 'paragraph',
          attrs: {
            class: 'file-upload-skeleton-placeholder',
          },
        });
      });
      
      // Insert skeletons at cursor position
      editor.chain().focus().setTextSelection(startPos).insertContent(skeletonPlaceholders).run();
      
      // Store the position and count for replacement
      const skeletonCount = fileList.length;
      
      try {
        console.log('Calling onFileUpload...');
        const results = await onFileUpload(fileList);
        console.log('Upload results:', results, 'Editor state:', { isDestroyed: editor.isDestroyed });
        
        if (!results || results.length === 0) {
          console.warn('No upload results returned');
          // Remove skeleton paragraphs if upload failed
          try {
            const doc = editor.state.doc;
            doc.nodesBetween(startPos, doc.content.size, (node, pos) => {
              if (node.type.name === 'paragraph' && node.attrs?.class === 'file-upload-skeleton-placeholder') {
                editor.chain().focus().setTextSelection({ from: pos, to: pos + node.nodeSize }).deleteSelection().run();
              }
            });
          } catch (cleanupError) {
            console.error('Failed to cleanup skeletons:', cleanupError);
          }
          return;
        }
        
        if (editor.isDestroyed) {
          console.error('Editor is destroyed, cannot insert files');
          return;
        }
        
        // Wait for editor state to stabilize
        await new Promise((resolve) => requestAnimationFrame(resolve));
        
        // Build content array with all attachments
        const contentToInsert: Array<{ type: string; attrs?: any }> = [];
        results.forEach((result, index) => {
          const inferredType = result.type || fileList[index]?.type || '';
          contentToInsert.push({
            type: 'fileAttachment',
            attrs: {
              id: result.id,
              name: result.name,
              size: result.size || 0,
              downloadUrl: result.downloadUrl || '',
              uploadedAt: new Date().toISOString(),
              type: inferredType,
            },
          });
          // Insert empty paragraph after each attachment (except the last one)
          if (index < results.length - 1) {
            contentToInsert.push({ type: 'paragraph' });
          }
        });
        // Add final paragraph after last attachment
        contentToInsert.push({ type: 'paragraph' });
        
        // Find and replace skeleton paragraphs with actual file attachments
        const doc = editor.state.doc;
        let replacedCount = 0;
        const positionsToReplace: Array<{ pos: number; resultIndex: number }> = [];
        
        // Find all skeleton paragraphs and their positions
        doc.nodesBetween(startPos, doc.content.size, (node, pos) => {
          if (node.type.name === 'paragraph' && node.attrs?.class === 'file-upload-skeleton-placeholder' && replacedCount < results.length) {
            positionsToReplace.push({ pos, resultIndex: replacedCount });
            replacedCount++;
          }
        });
        
        // Replace skeletons in reverse order to maintain positions
        positionsToReplace.reverse().forEach(({ pos, resultIndex }) => {
          const result = results[resultIndex];
          const inferredType = result.type || fileList[resultIndex]?.type || '';
          const node = doc.nodeAt(pos);
          
          if (node) {
            editor.chain()
              .focus()
              .setTextSelection({ from: pos, to: pos + node.nodeSize })
              .deleteSelection()
              .setTextSelection(pos)
              .insertContent([
                {
                  type: 'fileAttachment',
                  attrs: {
                    id: result.id,
                    name: result.name,
                    size: result.size || 0,
                    downloadUrl: result.downloadUrl || '',
                    uploadedAt: new Date().toISOString(),
                    type: inferredType,
                  },
                },
                { type: 'paragraph' },
              ])
              .run();
          }
        });
        
        // If we didn't replace all (fallback), insert remaining at current position
        if (replacedCount < results.length) {
          const remainingFiles = results.slice(replacedCount);
          const remainingContent: Array<{ type: string; attrs?: any }> = [];
          remainingFiles.forEach((result, index) => {
            const inferredType = result.type || fileList[replacedCount + index]?.type || '';
            remainingContent.push({
              type: 'fileAttachment',
              attrs: {
                id: result.id,
                name: result.name,
                size: result.size || 0,
                downloadUrl: result.downloadUrl || '',
                uploadedAt: new Date().toISOString(),
                type: inferredType,
              },
            });
            if (index < remainingFiles.length - 1) {
              remainingContent.push({ type: 'paragraph' });
            }
          });
          remainingContent.push({ type: 'paragraph' });
          
          const currentPos = editor.state.selection.from;
          editor.chain().focus().setTextSelection(currentPos).insertContent(remainingContent).run();
        }
        
        console.log('Files inserted successfully');
        
        // Manually trigger onChange to ensure parent state is synced
        // TipTap's onUpdate should fire, but we ensure it here for reliability
        // Defer to avoid flushSync during render cycle
        queueMicrotask(() => {
        if (editor && !editor.isDestroyed) {
          const content = editor.getJSON();
          onChange(content);
        }
        });
      } catch (error) {
        console.error('Failed to upload files:', error);
        toast.error('Failed to attach file');
        // Remove skeleton paragraphs on error
        try {
          const doc = editor.state.doc;
          doc.nodesBetween(startPos, doc.content.size, (node, pos) => {
            if (node.type.name === 'paragraph' && node.attrs?.class === 'file-upload-skeleton-placeholder') {
              editor.chain().focus().setTextSelection({ from: pos, to: pos + node.nodeSize }).deleteSelection().run();
            }
          });
        } catch (cleanupError) {
          console.error('Failed to cleanup skeletons:', cleanupError);
        }
      } finally {
        setIsUploading(false);
        isUploadingRef.current = false;
        // Notify parent that file selection ended
        onFileSelectEnd?.();
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      // Log why we didn't process files
      if (fileList.length > 0) {
        console.warn('Cannot attach files:', {
          editorExists: !!editor,
          editorDestroyed: editor?.isDestroyed,
        });
      }
      // Notify parent that file selection ended even if no files selected
      onFileSelectEnd?.();
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="border border-border rounded-md bg-background overflow-hidden relative [&_.ProseMirror_p.is-empty::before]:text-muted-foreground/50">
      <EditorContent editor={editor} className="min-h-[150px] max-h-[300px]" />
      <div className="flex items-center justify-end px-3 py-1.5 relative z-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            if (disabled || isUploading) return;
            e.stopPropagation();
            // Notify parent that file selection is starting
            onFileSelectStart?.();
            fileInputRef.current?.click();
          }}
          onMouseDown={(e) => {
            if (disabled || isUploading) return;
            // Prevent blur when clicking attach button
            e.stopPropagation();
          }}
          disabled={disabled || isUploading}
          className="h-7 w-7 pointer-events-auto"
          title={isUploading ? 'Uploading...' : 'Attach file'}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          onClick={(e) => {
            // Prevent blur when clicking file input
            e.stopPropagation();
          }}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>
    </div>
  );
}

