'use client';

import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import {
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import type { FileRejection } from 'react-dropzone';
import Dropzone from 'react-dropzone';

interface QuestionnaireUploadProps {
  selectedFile: File | null;
  onFileSelect: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
  onFileRemove: () => void;
  onParse: () => void;
  isLoading: boolean;
  parseStatus: 'uploading' | 'starting' | 'queued' | 'analyzing' | 'processing' | null;
  orgId: string;
  hasResults?: boolean;
}

export function QuestionnaireUpload({
  selectedFile,
  onFileSelect,
  onFileRemove,
  onParse,
  isLoading,
  parseStatus,
  hasResults = false,
}: QuestionnaireUploadProps) {
  return (
    <div className="flex flex-col gap-6">
        {selectedFile ? (
          <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border/40">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
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
              'application/pdf': ['.pdf'],
              'application/vnd.ms-excel': ['.xls'],
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'text/csv': ['.csv'],
            }}
          >
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div
                {...getRootProps()}
                className={cn(
                  'flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xs p-12 lg:p-16 cursor-pointer transition-all',
                  isDragActive
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-border/40 bg-muted/10 hover:border-primary/40 hover:bg-muted/20',
                  isLoading && 'opacity-50 pointer-events-none',
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {isDragActive ? 'Drop file here' : 'Drag & drop or click to select'}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
            disabled={isLoading || !selectedFile || hasResults}
            className="h-11 lg:h-12 px-6 lg:px-8 w-full sm:w-auto"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="transition-opacity duration-500">
                  {parseStatus === 'uploading'
                    ? 'Uploading your file...'
                    : parseStatus === 'starting'
                      ? 'Getting ready...'
                      : parseStatus === 'queued'
                        ? 'Almost ready...'
                        : parseStatus === 'analyzing'
                          ? 'Reading your document...'
                          : parseStatus === 'processing'
                            ? 'Finding questions...'
                            : 'Almost done...'}
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

