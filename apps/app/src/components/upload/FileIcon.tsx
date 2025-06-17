'use client';

import { File, FileImage, FileText } from 'lucide-react';

interface FileIconProps {
  fileName: string;
}

export function FileIcon({ fileName }: FileIconProps) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return <FileImage className="text-muted-foreground h-12 w-12" />;
  }
  if (extension && ['pdf', 'doc', 'docx', 'txt'].includes(extension)) {
    return <FileText className="text-muted-foreground h-12 w-12" />;
  }
  return <File className="text-muted-foreground h-12 w-12" />;
}
