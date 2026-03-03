'use client';

import { usePolicyActions } from '@/hooks/use-policies';
import { useMediaQuery } from '@comp/ui/hooks';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  ScrollArea,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Close, DocumentPdf, Upload } from '@trycompai/design-system/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_FILES = 50;
const ACCEPTED_TYPES = ['application/pdf'];

function formatPolicyName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');

  const spaced = withoutExtension
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-+.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return spaced
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BulkUploadPoliciesSheet() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get('bulk-upload-policies') === 'true';

  const handleOpenChange = (open: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (open) {
      params.set('bulk-upload-policies', 'true');
    } else {
      params.delete('bulk-upload-policies');
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Upload Policies</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <ScrollArea>
              <BulkUploadForm onClose={() => handleOpenChange(false)} />
            </ScrollArea>
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Upload Policies</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <BulkUploadForm onClose={() => handleOpenChange(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

interface BulkUploadFormProps {
  onClose: () => void;
}

function BulkUploadForm({ onClose }: BulkUploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { bulkUpload } = usePolicyActions();

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const validFiles: File[] = [];

      for (const file of Array.from(newFiles)) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`${file.name} is not a PDF file`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} exceeds the 25 MB limit`);
          continue;
        }
        if (files.some((f) => f.name === file.name && f.size === file.size)) {
          continue;
        }
        validFiles.push(file);
      }

      const combined = [...files, ...validFiles];
      if (combined.length > MAX_FILES) {
        toast.error(`You can upload a maximum of ${MAX_FILES} files at once`);
        setFiles(combined.slice(0, MAX_FILES));
      } else {
        setFiles(combined);
      }
    },
    [files],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const fileEntries = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          fileType: file.type,
          fileData: await fileToBase64(file),
        })),
      );

      const result = await bulkUpload(fileEntries);
      const { summary } = result;
      if (summary.failed === 0) {
        toast.success(
          `Successfully created ${summary.succeeded} ${summary.succeeded === 1 ? 'policy' : 'policies'}`,
        );
      } else {
        toast.warning(
          `Created ${summary.succeeded} of ${summary.total} policies. ${summary.failed} failed.`,
        );
      }
      setFiles([]);
      onClose();
    } catch {
      toast.error('Failed to upload policies');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Stack gap="md">
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="rounded-full border border-dashed p-3">
          <Upload size={24} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <Text size="sm" weight="medium">
            Drop PDF files here or click to browse
          </Text>
          <Text size="xs" variant="muted">
            Up to {MAX_FILES} files, {formatFileSize(MAX_FILE_SIZE)} each
          </Text>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" weight="medium">
            {files.length} {files.length === 1 ? 'file' : 'files'} selected
          </Text>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}`}
                className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <DocumentPdf size={20} className="shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <Text size="sm" weight="medium">
                    {formatPolicyName(file.name)}
                  </Text>
                  <Text size="xs" variant="muted">
                    {file.name} &middot; {formatFileSize(file.size)}
                  </Text>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={isUploading}
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <Close size={16} />
                </button>
              </div>
            ))}
          </div>
        </Stack>
      )}

      {files.length > 0 && (
        <Button onClick={handleUpload} loading={isUploading} iconLeft={<Upload size={16} />}>
          Upload {files.length} {files.length === 1 ? 'Policy' : 'Policies'}
        </Button>
      )}
    </Stack>
  );
}
