'use client';

import { useRef, useState } from 'react';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FleetPolicy } from '../../types';

interface PolicyImageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: FleetPolicy;
}

export function PolicyImageUploadModal({ open, onOpenChange, policy }: PolicyImageUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const imageFiles = selected.filter((file) => file.type.startsWith('image/'));
    const withPreviews = imageFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...withPreviews]);

    // reset input so same files can be reselected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onRemoveFile = (target: { file: File; previewUrl: string }) => {
    URL.revokeObjectURL(target.previewUrl);
    setFiles((prev) => prev.filter((item) => item !== target));
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      files.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      setFiles([]);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (files.length === 0 || isLoading) return;

    try {
      setIsLoading(true);

      const formData = new FormData();
      formData.append('policyId', String(policy.id));
      formData.append('policyName', policy.name);

      files.forEach(({ file }) => {
        formData.append('files', file, file.name);
      });

      const response = await fetch('/api/confirm-fleet-policy', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload policy images');
      }

      toast.success('Policy images uploaded successfully');
      handleClose(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to upload policy images', error);
      const message = error instanceof Error ? error.message : 'Failed to upload policy images';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Upload Policy Images</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {files.length === 0 && (
            <div className="flex items-center justify-center w-full h-48">
              <Button
                type="button"
                variant="outline"
                className="w-24 h-24 text-muted-foreground/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-8 w-8" />
              </Button>
            </div>
          )}

          {files.length > 0 && (
            <div className="rounded-md border">
              <div className="max-h-48 overflow-y-auto">
                <ul className="divide-y text-sm">
                  {files.map((item, idx) => (
                    <li
                      key={`${item.file.name}-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded border bg-muted">
                          <Image
                            src={item.previewUrl}
                            alt={item.file.name}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="truncate">{item.file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => onRemoveFile(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {files.length > 0 && (
            <>
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-sm text-muted-foreground">
                  {files.length} file{files.length === 1 ? '' : 's'}
                </span>
              </div>
              <Button
                variant="outline"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                Upload +
              </Button>
            </>
          )}
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={files.length === 0 || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}