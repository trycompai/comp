'use client';

import { apiClient } from '@/lib/api-client';
import { Button, Text } from '@trycompai/design-system';
import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import type { BackgroundCheckRecord } from './backgroundCheckTypes';

const ACCEPTED_BACKGROUND_CHECK_FILES = '.pdf,.png,.jpg,.jpeg';

export function CustomBackgroundCheckUpload({
  canRequest,
  employeeEmail,
  employeeId,
  employeeName,
  organizationId,
  onUploaded,
}: {
  canRequest: boolean;
  employeeEmail: string;
  employeeId: string;
  employeeName: string;
  organizationId: string;
  onUploaded: (backgroundCheck: BackgroundCheckRecord) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleChooseFile = () => {
    inputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Choose a background check file first');
      return;
    }

    setIsUploading(true);
    try {
      const fileData = await fileToBase64(selectedFile);
      const response = await apiClient.post<BackgroundCheckRecord>(
        `/v1/people/${employeeId}/background-check/custom`,
        {
          employeeName,
          employeeEmail,
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'application/octet-stream',
          fileData,
        },
        organizationId,
      );

      if (response.error || !response.data) {
        toast.error('Failed to upload background check');
        return;
      }

      toast.success('Custom background check attached');
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      await onUploaded(response.data);
    } catch {
      toast.error('Failed to upload background check');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mt-3 flex justify-end">
      <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <Text size="xs" variant="muted">
          Already have one?
        </Text>
        <input
          ref={inputRef}
          id="custom-background-check-file"
          type="file"
          accept={ACCEPTED_BACKGROUND_CHECK_FILES}
          aria-label="Background check file"
          disabled={!canRequest || isUploading}
          onChange={handleFileChange}
          className="sr-only"
        />
        <button
          type="button"
          disabled={!canRequest || isUploading}
          onClick={handleChooseFile}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          Attach a report instead
        </button>
        {selectedFile && (
          <>
            <Text size="xs" variant="muted">
              {selectedFile.name}
            </Text>
            <div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={isUploading}
                disabled={!canRequest || isUploading}
                onClick={handleUpload}
              >
                Upload
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read file'));
        return;
      }
      const [, base64Data] = reader.result.split(',');
      if (!base64Data) {
        reject(new Error('Failed to read file'));
        return;
      }
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
