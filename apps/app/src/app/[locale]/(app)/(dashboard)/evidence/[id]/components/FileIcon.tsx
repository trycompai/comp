"use client";

import { File, FileImage, FileText } from "lucide-react";

interface FileIconProps {
  fileName: string;
}

export function FileIcon({ fileName }: FileIconProps) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension && ["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
    return <FileImage className="h-12 w-12 text-muted-foreground" />;
  }
  if (extension && ["pdf", "doc", "docx", "txt"].includes(extension)) {
    return <FileText className="h-12 w-12 text-muted-foreground" />;
  }
  return <File className="h-12 w-12 text-muted-foreground" />;
}
