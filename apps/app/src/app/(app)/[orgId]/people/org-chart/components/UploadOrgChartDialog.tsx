'use client';

import { useCallback, useState } from 'react';
import Dropzone, { type FileRejection } from 'react-dropzone';
import { Button } from '@trycompai/design-system';
import { Upload, Close } from '@trycompai/design-system/icons';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface UploadOrgChartDialogProps {
  onClose: () => void;
}

export function UploadOrgChartDialog({ onClose }: UploadOrgChartDialogProps) {
  const api = useApi();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        toast.error('Invalid file type. Please upload a PNG, JPG, or PDF.');
        return;
      }
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
      }
    },
    [],
  );

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data URL prefix to get pure base64
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const response = await api.post('/v1/org-chart/upload', {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileData: base64,
      });

      if (response.error) {
        toast.error('Failed to upload org chart');
        return;
      }

      toast.success('Org chart uploaded');
      router.refresh();
      onClose();
    } catch {
      toast.error('Failed to upload org chart');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Upload Org Chart
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <Close size={20} />
        </button>
      </div>

      <Dropzone
        onDrop={onDrop}
        accept={{
          'image/png': ['.png'],
          'image/jpeg': ['.jpg', '.jpeg'],
          'application/pdf': ['.pdf'],
        }}
        maxSize={100 * 1024 * 1024}
        maxFiles={1}
        multiple={false}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...(getRootProps() as React.HTMLProps<HTMLDivElement>)}
            className={`grid h-48 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed transition ${
              isDragActive
                ? 'border-primary/50 bg-primary/5'
                : 'border-border hover:bg-muted/25'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-full border border-dashed border-border p-3">
                <Upload size={24} className="text-muted-foreground" />
              </div>
              {selectedFile ? (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB - Click or drop to
                    replace
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Drop an image here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports PNG, JPG, PDF (up to 100MB)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Dropzone>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleUpload}
          disabled={!selectedFile}
          loading={isUploading}
        >
          Upload
        </Button>
      </div>
    </div>
  );
}
