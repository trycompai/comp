import type { AttachmentType } from '@db';
import { FileAudio, FileIcon, FileImage, FileText, FileVideo } from 'lucide-react';
import type React from 'react';

// Helper function to get icon and color based on file type enum
export function getAttachmentIconAndColor(type: AttachmentType | null | undefined): {
  Icon: React.ElementType;
  colorClass: string;
} {
  switch (type) {
    case 'image':
      return { Icon: FileImage, colorClass: 'text-purple-500' };
    case 'video':
      return { Icon: FileVideo, colorClass: 'text-cyan-500' };
    case 'audio':
      return { Icon: FileAudio, colorClass: 'text-pink-500' };
    case 'document':
      // Could try to be smarter based on name later, but for now:
      return { Icon: FileText, colorClass: 'text-blue-500' };
    default:
      // Handles "other", null, undefined
      // Could use FileArchive, FileCode2 based on name later?
      return { Icon: FileIcon, colorClass: 'text-gray-500' }; // Default
  }
}
