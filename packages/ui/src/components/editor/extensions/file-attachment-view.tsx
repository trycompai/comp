'use client';

import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { Download, FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '../../../utils';
import { Button } from '../../button';
import type { FileAttachmentAttributes } from './file-attachment';

type FileAttachmentViewProps = ReactNodeViewProps & {
  node: ReactNodeViewProps['node'] & { attrs: FileAttachmentAttributes };
  extension: ReactNodeViewProps['extension'] & {
    options: {
      getDownloadUrl?: (attachmentId: string) => Promise<string | null>;
      onDelete?: (attachmentId: string) => Promise<void> | void;
    };
  };
};

export function FileAttachmentView({
  node,
  deleteNode,
  editor,
  updateAttributes,
  extension,
}: FileAttachmentViewProps) {
  const { name, size, downloadUrl, type: fileType, id } = node.attrs;
  const editable = editor.isEditable;
  const resolveDownloadUrl = extension?.options?.getDownloadUrl;
  const onDelete = extension?.options?.onDelete;

  // State to track the current image URL (may be refreshed)
  const [imageUrl, setImageUrl] = useState<string | null>(downloadUrl || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadFile = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = name || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  };

  const handleDownload = async () => {
    // Try using the refreshed image URL first, then fall back to stored downloadUrl
    const urlToUse = imageUrl || downloadUrl;

    if (urlToUse) {
      try {
        await downloadFile(urlToUse);
        return;
      } catch (error) {
        console.warn('Existing download URL failed, attempting refresh...', error);
      }
    }

    if (!resolveDownloadUrl || !id) {
      console.error('No download resolver configured for attachment');
      return;
    }

    try {
      const freshUrl = await resolveDownloadUrl(id);
      if (!freshUrl) {
        throw new Error('Failed to refresh download URL');
      }
      setImageUrl(freshUrl);
      updateAttributes?.({ downloadUrl: freshUrl });
      await downloadFile(freshUrl);
    } catch (error) {
      console.error('Failed to refresh download URL:', error);
    }
  };

  const hasImageExtension = (filename?: string) => {
    if (!filename) return false;
    return /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(filename);
  };

  const showImagePreview =
    Boolean(imageUrl || downloadUrl) && (fileType?.startsWith('image/') || hasImageExtension(name));

  // Refresh image URL when it expires
  const refreshImageUrl = async () => {
    if (!resolveDownloadUrl || !id || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const freshUrl = await resolveDownloadUrl(id);
      if (freshUrl) {
        setImageUrl(freshUrl);
        // Update the node attributes so the refreshed URL persists
        updateAttributes?.({ downloadUrl: freshUrl });
      }
    } catch (error) {
      console.error('Failed to refresh image URL:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh URL on mount if it's an image and we have a resolver but no valid URL
  useEffect(() => {
    if (showImagePreview && resolveDownloadUrl && id && !imageUrl && !downloadUrl) {
      refreshImageUrl();
    } else if (showImagePreview && downloadUrl && !imageUrl) {
      // If we have a downloadUrl but no imageUrl state, initialize it
      setImageUrl(downloadUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showImagePreview, resolveDownloadUrl, id]);

  // Handle image load error (expired URL)
  const handleImageError = () => {
    if (resolveDownloadUrl && id && !isRefreshing) {
      refreshImageUrl();
    }
  };

  // Handle image click - open in new tab instead of downloading
  const handleImageClick = () => {
    const urlToOpen = imageUrl || downloadUrl;
    if (urlToOpen) {
      window.open(urlToOpen, '_blank');
    }
  };

  // Handle delete - call API to delete from S3, then remove node
  const handleDelete = async () => {
    if (!id || isDeleting) return;

    setIsDeleting(true);
    try {
      // Call API to delete from S3 and database
      if (onDelete) {
        await onDelete(id);
      }

      // Remove the node from the editor
      if (deleteNode) {
        deleteNode();
      } else if (editor) {
        editor.chain().focus().deleteSelection().run();
      }
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      toast.error('Failed to delete attachment');
      setIsDeleting(false);
    }
  };

  return (
    <NodeViewWrapper as="span" className="block w-full my-2" data-type="file-attachment">
      {showImagePreview ? (
        <div
          className="relative my-2 inline-block file-attachment-node"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl || downloadUrl || ''}
            alt={name}
            className="block h-auto max-h-[400px] max-w-full object-contain cursor-pointer rounded-md border border-border bg-background"
            loading="lazy"
            draggable={false}
            onError={handleImageError}
            onClick={(e) => {
              e.stopPropagation();
              handleImageClick();
            }}
          />
          <div className="absolute top-2 right-2 flex gap-1 rounded-md bg-background/80 p-1 shadow-sm">
            {(imageUrl || downloadUrl) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                title="Download image"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
            {editable && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDelete();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                disabled={isDeleting}
                title="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center gap-3 rounded-md border border-border bg-muted/50 px-3 py-2 min-h-[64px] file-attachment-node',
            editable && 'hover:bg-muted transition-colors',
          )}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium text-foreground truncate" title={name}>
              {name}
            </span>
            {size && size > 0 && (
              <span className="text-xs text-muted-foreground">{formatFileSize(size)}</span>
            )}
          </div>
          {downloadUrl && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {editable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDelete();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              disabled={isDeleting}
              title="Remove attachment"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}
