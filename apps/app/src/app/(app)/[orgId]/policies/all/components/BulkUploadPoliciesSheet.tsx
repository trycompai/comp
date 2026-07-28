'use client';

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

interface BulkUploadResponse {
  createdCount?: number;
  failedCount?: number;
  error?: string;
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
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const resetAndClose = () => {
    setFiles([]);
    onOpenChange(false);
  };

  const handleDrop = (accepted: File[]) => {
    if (accepted.length === 0) return;
    setFiles((prev) => {
      // De-dupe by name+size so re-dropping the same file doesn't stack.
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      const merged = [...prev];
      for (const f of accepted) {
        const key = `${f.name}:${f.size}`;
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
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const payload = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          fileType: file.type || 'application/pdf',
          fileData: await readFileAsBase64(file),
        })),
      );

      const response = await fetch('/api/policies/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ files: payload }),
      });

      const data = (await response
        .json()
        .catch(() => null)) as BulkUploadResponse | null;

      if (!response.ok) {
        toast.error(data?.error || 'Failed to upload policies.');
        return;
      }

      const created = data?.createdCount ?? 0;
      const failed = data?.failedCount ?? 0;

      if (created === 0) {
        toast.error(data?.error || 'No policies were imported.');
        return;
      }

      toast.success(
        `Imported ${created} ${created === 1 ? 'policy' : 'policies'}${
          failed > 0 ? ` — ${failed} failed` : ''
        }.`,
      );
      router.refresh();
      if (failed > 0) {
        // Partial success: keep the sheet open so the user can retry the rest.
        setFiles([]);
      } else {
        resetAndClose();
      }
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
                {files.map((file, index) => (
                  <div
                    key={`${file.name}:${file.size}`}
                    className="flex items-center gap-2 rounded-sm border px-3 py-2"
                  >
                    <DocumentPdf
                      size={16}
                      className="text-muted-foreground shrink-0"
                    />
                    <span className="flex-1 truncate text-sm" title={file.name}>
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
                ))}
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
