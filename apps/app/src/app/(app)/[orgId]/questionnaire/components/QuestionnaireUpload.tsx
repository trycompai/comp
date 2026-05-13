'use client';

import { Button, cn } from '@trycompai/design-system';
import { Close, Document, Upload } from '@trycompai/design-system/icons';
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
              <Document size={20} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!isLoading && (
              <div className="shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFileRemove}
                  disabled={isLoading}
                  iconLeft={<Close size={16} />}
                />
              </div>
            )}
          </div>
        ) : (
          <Dropzone
            onDrop={onFileSelect}
            maxSize={100 * 1024 * 1024}
            maxFiles={1}
            multiple={false}
            disabled={isLoading}
            accept={{
              'application/pdf': ['.pdf'],
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
                  <Upload size={40} />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {isDragActive ? 'Drop file here' : 'Drag & drop or click to select'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, XLSX, CSV (max 100MB)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Dropzone>
        )}

        <div className="flex items-center justify-end">
          <div className="w-full sm:w-auto">
            <Button
              onClick={onParse}
              disabled={isLoading || !selectedFile || hasResults}
              loading={isLoading}
              size="lg"
              iconLeft={!isLoading ? <Document size={16} /> : undefined}
            >
              {isLoading
                ? parseStatus === 'uploading'
                  ? 'Uploading your file...'
                  : parseStatus === 'starting'
                    ? 'Getting ready...'
                    : parseStatus === 'queued'
                      ? 'Almost ready...'
                      : parseStatus === 'analyzing'
                        ? 'Reading your document...'
                        : parseStatus === 'processing'
                          ? 'Finding questions...'
                          : 'Almost done...'
                : 'Analyze Questionnaire'}
            </Button>
          </div>
        </div>
    </div>
  );
}

