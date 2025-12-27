'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import type { TaskItemEntityType } from '@/hooks/use-task-items';
import { AttachmentEntityType } from '@db';

interface UploadResult {
  id: string;
  name: string;
  size?: number;
  downloadUrl?: string;
  type?: string;
}

interface UseTaskItemAttachmentUploadOptions {
  entityId: string;
  entityType: TaskItemEntityType;
}

export function useTaskItemAttachmentUpload({
  entityId,
  entityType,
}: UseTaskItemAttachmentUploadOptions) {
  const { orgId } = useParams<{ orgId: string }>();
  const [isUploading, setIsUploading] = useState(false);

  const uploadAttachment = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      if (!orgId) {
        toast.error('Organization ID is required');
        return null;
      }

      // Validate file size (100MB limit)
      const MAX_FILE_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
        return null;
      }

      // Block dangerous file types
      const BLOCKED_EXTENSIONS = [
        'exe', 'bat', 'cmd', 'com', 'scr', 'msi',
        'js', 'vbs', 'vbe', 'wsf', 'wsh', 'ps1',
        'sh', 'bash', 'zsh',
        'dll', 'sys', 'drv',
        'app', 'deb', 'rpm', 'jar',
        'pif', 'lnk', 'cpl',
        'hta', 'reg',
      ];

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (fileExt && BLOCKED_EXTENSIONS.includes(fileExt)) {
        toast.error(`File extension ".${fileExt}" is not allowed for security reasons`);
        return null;
      }

      setIsUploading(true);

      try {
        // Convert file to base64
        const fileData = await fileToBase64(file);

        // Upload via API - pass entityType and entityId for proper S3 path
        const response = await api.post<{
          id: string;
          name: string;
          type: string;
          downloadUrl: string;
          createdAt: string;
          size: number;
        }>(
          '/v1/task-management/attachments',
          {
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileData,
            entityId,
            entityType,
          },
          orgId,
        );

        if (response.error) {
          throw new Error(response.error || 'Failed to upload attachment');
        }

        if (!response.data) {
          throw new Error('Invalid response from server');
        }

        return {
          id: response.data.id,
          name: response.data.name,
          size: response.data.size,
          downloadUrl: response.data.downloadUrl,
          type: response.data.type,
        };
      } catch (error) {
        console.error('Failed to upload attachment:', error);
        toast.error(
          `Failed to upload file: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [orgId, entityId],
  );

  return {
    uploadAttachment,
    isUploading,
  };
}

// Helper function to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

