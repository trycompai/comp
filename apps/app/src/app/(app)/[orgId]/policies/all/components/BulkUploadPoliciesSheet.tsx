'use client';

import { useApi } from '@/hooks/use-api';
import { bulkUploadPoliciesViaApi } from '@/lib/policies-bulk-upload';
import {
  Button,
  cn,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import { DocumentPdf, TrashCan, Upload } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Dropzone from 'react-dropzone';
import { toast } from 'sonner';

const MAX_FILES = 25;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB, matching the single PDF upload.

interface BulkUploadPoliciesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Stable per-file identity used for de-dupe, error mapping, and retry. */
function fileKey(file: { name: string; size: number }): string {
  return `${file.name}:${file.size}`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function BulkUploadPoliciesSheet({
  open,
  onOpenChange,
}: BulkUploadPoliciesSheetProps) {
  const router = useRouter();
  const api = useApi();
  const [files, setFiles] = useState<File[]>([]);
  // Per-file upload errors, keyed by name+size, surfaced inline after an upload.
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  const resetAndClose = () => {
    setFiles([]);
    setErrors({});
    onOpenChange(false);
  };

  const handleDrop = (accepted: File[]) => {
    if (accepted.length === 0) return;
    setFiles((prev) => {
      // De-dupe by name+size so re-dropping the same file doesn't stack.
      const seen = new Set(prev.map(fileKey));
      const merged = [...prev];
      for (const f of accepted) {
        const key = fileKey(f);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(f);
        }
      }
      if (merged.length > MAX_FILES) {
        toast.error(`You can upload at most ${MAX_FILES} policies at a time.`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
  };

  const handleRemove = (index: number) => {
    const removed = files[index];
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (removed) {
      setErrors((prev) => {
        const key = fileKey(removed);
        if (!(key in prev)) return prev;
        const rest = { ...prev };
        delete rest[key];
        return rest;
      });
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setErrors({});
    try {
      // Upload straight to the NestJS API from the browser (like the
      // single-policy PDF upload) so the PDFs never pass through the Next.js
      // route's body limit, processed with bounded concurrency.
      const { results, createdCount, failedCount } =
        await bulkUploadPoliciesViaApi({
          post: api.post,
          files,
          readFileAsBase64,
        });

      if (createdCount > 0) {
        toast.success(
          `Imported ${createdCount} ${
            createdCount === 1 ? 'policy' : 'policies'
          }${failedCount > 0 ? ` — ${failedCount} failed` : ''}.`,
        );
        router.refresh();
      }

      if (failedCount === 0) {
        resetAndClose();
        return;
      }

      // Keep only the failed files (matched by name+size) with their error so
      // the user can review what went wrong and retry just those.
      const failedErrors: Record<string, string> = {};
      for (const r of results) {
        if (r.status === 'failed') {
          failedErrors[`${r.fileName}:${r.fileSize}`] =
            r.error ?? 'Upload failed.';
        }
      }
      if (createdCount === 0) {
        toast.error(
          results.find((r) => r.status === 'failed')?.error ||
            'No policies were imported.',
        );
      }
      setErrors(failedErrors);
      setFiles((prev) => prev.filter((f) => fileKey(f) in failedErrors));
    } catch {
      toast.error('Failed to upload policies.');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadLabel =
    files.length === 0
      ? 'Upload'
      : `Upload ${files.length} ${files.length === 1 ? 'policy' : 'policies'}`;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Bulk upload policies</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <Stack gap="md">
            <Text>
              Import pre-existing policy documents you&apos;re migrating from
              another platform. Each PDF becomes a draft policy with the
              document attached — up to {MAX_FILES} at a time.
            </Text>

            <Dropzone
              onDrop={handleDrop}
              accept={{ 'application/pdf': [] }}
              maxSize={MAX_FILE_SIZE}
              multiple
              disabled={isUploading}
              onDropRejected={() =>
                toast.error('Only PDF files up to 100MB are supported.')
              }
            >
              {({ getRootProps, getInputProps, isDragActive }) => (
                <div
                  {...getRootProps()}
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors',
                    isDragActive
                      ? 'border-primary bg-primary/10'
                      : 'border-primary/30 hover:border-primary/50',
                    isUploading && 'pointer-events-none opacity-60',
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload size={32} className="text-primary" />
                  <p className="text-muted-foreground text-sm">
                    {isDragActive
                      ? 'Drop your PDFs here'
                      : 'Drag and drop PDFs here, or click to browse'}
                  </p>
                </div>
              )}
            </Dropzone>

            {files.length > 0 && (
              <div className="flex flex-col gap-1">
                {files.map((file, index) => {
                  const error = errors[fileKey(file)];
                  return (
                    <div
                      key={fileKey(file)}
                      className={cn(
                        'flex flex-col gap-1 rounded-sm border px-3 py-2',
                        error && 'border-destructive/50',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <DocumentPdf
                          size={16}
                          className="text-muted-foreground shrink-0"
                        />
                        <span
                          className="flex-1 truncate text-sm"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(index)}
                          disabled={isUploading}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                          aria-label={`Remove ${file.name}`}
                        >
                          <TrashCan size={16} />
                        </button>
                      </div>
                      {error && (
                        <span className="text-destructive pl-6 text-xs">
                          {error}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Stack>
        </SheetBody>
        <SheetFooter>
          <Button
            variant="outline"
            onClick={resetAndClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            loading={isUploading}
            disabled={files.length === 0}
          >
            {uploadLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
