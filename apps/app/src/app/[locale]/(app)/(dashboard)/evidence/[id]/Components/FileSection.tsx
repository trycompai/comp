"use client";

import { useCallback, useState, useEffect } from "react";
import { FileUpload } from "./FileUpload";
import { useFileUpload } from "../hooks/useFileUpload";
import { useFileDelete } from "../hooks/useFileDelete";
import { useFilePreview } from "../hooks/useFilePreview";
import { FileCard } from "./FileCard";
import { Card, CardContent } from "@bubba/ui/card";
import { Plus } from "lucide-react";

interface FileSectionProps {
  evidenceId: string;
  fileUrls: string[];
  onSuccess: () => Promise<void>;
}

interface FilePreviewState {
  url: string | null;
  isLoading: boolean;
}

export function FileSection({
  evidenceId,
  fileUrls,
  onSuccess,
}: FileSectionProps) {
  const { isUploading, handleFileUpload } = useFileUpload({
    evidenceId,
    onSuccess,
  });

  const { handleDelete } = useFileDelete({
    evidenceId,
    onSuccess,
  });

  const { getPreviewUrl } = useFilePreview({
    evidenceId,
  });

  // Track preview state for each file
  const [previewStates, setPreviewStates] = useState<
    Record<string, FilePreviewState>
  >({});
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [showUploadDropzone, setShowUploadDropzone] = useState(false);

  const handlePreviewClick = useCallback(
    async (fileUrl: string) => {
      try {
        // Skip if already loading or loaded
        if (previewStates[fileUrl]?.isLoading || previewStates[fileUrl]?.url) {
          return;
        }

        setPreviewStates((prev) => ({
          ...prev,
          [fileUrl]: { url: null, isLoading: true },
        }));

        const previewUrl = await getPreviewUrl(fileUrl);

        setPreviewStates((prev) => ({
          ...prev,
          [fileUrl]: { url: previewUrl, isLoading: false },
        }));
      } catch (error) {
        console.error("Error loading preview:", error);
        setPreviewStates((prev) => ({
          ...prev,
          [fileUrl]: { url: null, isLoading: false },
        }));
      }
    },
    [getPreviewUrl, previewStates]
  );

  // Load all previews when component mounts or when fileUrls change
  useEffect(() => {
    // Only load previews for files that don't already have a preview state
    const filesToLoad = fileUrls.filter((url) => !previewStates[url]);

    if (filesToLoad.length > 0) {
      // Load previews in sequence to avoid overwhelming the server
      const loadPreviews = async () => {
        for (const url of filesToLoad) {
          await handlePreviewClick(url);
        }
      };

      loadPreviews();
    }
  }, [fileUrls, handlePreviewClick, previewStates]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Files</h3>
        <span className="text-xs text-muted-foreground">
          {fileUrls.length} file{fileUrls.length !== 1 ? "s" : ""} uploaded
        </span>
      </div>

      {/* Only show the full dropzone when no files exist or when explicitly shown */}
      {(fileUrls.length === 0 || showUploadDropzone) && (
        <div className="mb-4">
          <FileUpload
            onFileSelect={(file) => {
              handleFileUpload(file);
              setShowUploadDropzone(false);
            }}
            isUploading={isUploading}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Add Files Card - Always first in the grid */}
        {!showUploadDropzone && fileUrls.length > 0 && (
          <Card
            className="group cursor-pointer transition-all hover:shadow-md border-dashed border-2 border-primary/30 hover:border-primary h-[220px] flex flex-col overflow-hidden"
            onClick={() => setShowUploadDropzone(true)}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-4">
              <div className="rounded-full bg-primary/10 p-3 mb-2">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-center">Add Files</p>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Upload additional evidence files
              </p>
            </CardContent>
          </Card>
        )}

        {/* File Cards */}
        {fileUrls.map((url) => {
          const previewState = previewStates[url] || {
            url: null,
            isLoading: false,
          };

          return (
            <FileCard
              key={url}
              url={url}
              previewState={previewState}
              isDialogOpen={openDialogId === url}
              onOpenChange={(open) => {
                if (open) {
                  setOpenDialogId(url);
                  handlePreviewClick(url);
                } else {
                  setOpenDialogId(null);
                }
              }}
              onPreviewClick={handlePreviewClick}
              onDelete={handleDelete}
            />
          );
        })}
      </div>
    </div>
  );
}
