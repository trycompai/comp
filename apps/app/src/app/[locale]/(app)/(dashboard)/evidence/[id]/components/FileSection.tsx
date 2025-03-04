"use client";

import { useCallback, useState, useEffect } from "react";
import { FileUpload } from "./FileUpload";
import { useFileUpload } from "../hooks/useFileUpload";
import { useFileDelete } from "../hooks/useFileDelete";
import { useFilePreview } from "../hooks/useFilePreview";
import { FileCard } from "./FileCard";

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
    [getPreviewUrl, previewStates],
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Add Files Card - Using the card variant of FileUpload */}
        <FileUpload
          onFileSelect={(file) => {
            handleFileUpload(file);
          }}
          isUploading={isUploading}
          variant="card"
          cardHeight="h-[220px]"
        />

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
