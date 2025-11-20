"use client";

import type { FileRejection } from "react-dropzone";
import { FileText, Loader2, Upload, X } from "lucide-react";
import Dropzone from "react-dropzone";

import { Button } from "@trycompai/ui/button";
import { cn } from "@trycompai/ui/cn";

interface QuestionnaireUploadProps {
  selectedFile: File | null;
  onFileSelect: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
  onFileRemove: () => void;
  onParse: () => void;
  isLoading: boolean;
  parseStatus:
    | "uploading"
    | "starting"
    | "queued"
    | "analyzing"
    | "processing"
    | null;
  orgId: string;
}

export function QuestionnaireUpload({
  selectedFile,
  onFileSelect,
  onFileRemove,
  onParse,
  isLoading,
  parseStatus,
}: QuestionnaireUploadProps) {
  return (
    <div className="flex flex-col gap-6">
      {selectedFile ? (
        <div className="bg-muted/30 border-border/40 flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <FileText className="text-muted-foreground h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {selectedFile.name}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          {!isLoading && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onFileRemove}
              disabled={isLoading}
              className="h-9 w-9 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <Dropzone
          onDrop={onFileSelect}
          maxSize={10 * 1024 * 1024}
          maxFiles={1}
          multiple={false}
          disabled={isLoading}
          accept={{
            "application/pdf": [".pdf"],
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
              [".xlsx"],
            "text/csv": [".csv"],
          }}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xs border-2 border-dashed p-12 transition-all lg:p-16",
                isDragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border/40 bg-muted/10 hover:border-primary/40 hover:bg-muted/20",
                isLoading && "pointer-events-none opacity-50",
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <Upload className="text-muted-foreground h-10 w-10" />
                <div className="space-y-1 text-center">
                  <p className="text-foreground text-sm font-medium">
                    {isDragActive
                      ? "Drop file here"
                      : "Drag & drop or click to select"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    PDF, Excel, CSV (max 10MB)
                  </p>
                </div>
              </div>
            </div>
          )}
        </Dropzone>
      )}

      <div className="flex items-center justify-end">
        <Button
          onClick={onParse}
          disabled={isLoading || !selectedFile}
          className="h-11 w-full px-6 sm:w-auto lg:h-12 lg:px-8"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="transition-opacity duration-500">
                {parseStatus === "uploading"
                  ? "Uploading your file..."
                  : parseStatus === "starting"
                    ? "Getting ready..."
                    : parseStatus === "queued"
                      ? "Almost ready..."
                      : parseStatus === "analyzing"
                        ? "Reading your document..."
                        : parseStatus === "processing"
                          ? "Finding questions..."
                          : "Almost done..."}
              </span>
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Analyze Questionnaire
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
