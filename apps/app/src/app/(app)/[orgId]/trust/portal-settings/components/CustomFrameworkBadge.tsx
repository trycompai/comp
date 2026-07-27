'use client';

import { TrashCan, Upload } from '@trycompai/design-system/icons';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const ALLOWED_BADGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BADGE_BYTES = 256 * 1024; // 256KB — mirrors the API cap.

function getFrameworkInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2);
  return (words[0][0] + words[1][0]).slice(0, 2);
}

/**
 * The logo slot for a custom framework on the Trust Portal admin page. Shows the
 * uploaded badge image when present, otherwise an initials avatar (matching the
 * public portal fallback). When `onUpload` is provided and not disabled, the slot
 * doubles as an uploader (click to pick / replace, with a remove button).
 */
export function CustomFrameworkBadge({
  title,
  badgeUrl,
  onUpload,
  onRemove,
  disabled,
}: {
  title: string;
  badgeUrl?: string | null;
  onUpload?: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
}) {
  const [isBusy, setIsBusy] = useState(false);
  // Fall back to initials if the badge image fails to load (e.g. an expired
  // signed URL). Reset when the URL changes so a freshly uploaded/replaced
  // badge gets a fresh attempt.
  const [imgErrored, setImgErrored] = useState(false);
  useEffect(() => setImgErrored(false), [badgeUrl]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editable = !!onUpload && !disabled;

  const handleFile = async (file: File) => {
    // Match the server: gate on the MIME type (it becomes the stored ContentType).
    if (!ALLOWED_BADGE_TYPES.includes(file.type)) {
      toast.error('Badge must be a PNG, JPEG, or WebP image');
      return;
    }
    if (file.size > MAX_BADGE_BYTES) {
      toast.error('Badge must be less than 256KB');
      return;
    }
    if (!onUpload) return;
    setIsBusy(true);
    try {
      await onUpload(file);
      toast.success('Badge updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload badge');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setIsBusy(true);
    try {
      await onRemove();
      toast.success('Badge removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove badge');
    } finally {
      setIsBusy(false);
    }
  };

  const inner =
    badgeUrl && !imgErrored ? (
      <img
        src={badgeUrl}
        alt={`${title} badge`}
        className="h-16 w-16 rounded-lg border bg-white object-contain p-1"
        onError={() => setImgErrored(true)}
      />
    ) : (
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted text-lg font-semibold uppercase text-muted-foreground">
        {getFrameworkInitials(title)}
      </div>
    );

  if (!editable) {
    return <div className="relative h-16 w-16 shrink-0">{inner}</div>;
  }

  return (
    <div className="group relative h-16 w-16 shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={isBusy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          // Reset so re-selecting the same file still fires onChange.
          e.target.value = '';
          if (file) await handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => !isBusy && fileInputRef.current?.click()}
        aria-label={badgeUrl ? 'Replace badge' : 'Upload badge'}
        className="h-16 w-16 cursor-pointer"
      >
        {inner}
        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {isBusy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Upload className="h-4 w-4 text-white" />
          )}
        </span>
      </button>
      {badgeUrl && !isBusy && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove badge"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <TrashCan className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
