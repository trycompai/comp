'use client';

import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import {
  FileSpreadsheet,
  FileText,
  FileText as FileTextIcon,
  Loader2,
  Sparkles,
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 w-full items-start">
      <div className="lg:col-span-2 flex flex-col gap-6">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={onFileRemove}
              disabled={isLoading}
              className="h-9 w-9 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
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
            disabled={isLoading || !selectedFile}
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

      <div className="hidden lg:flex flex-col gap-6">
        <div className="flex flex-col gap-4 p-6 rounded-xs bg-muted/30 border border-border/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-xs bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground mb-1">AI-Powered Answers</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our AI automatically reads questions and generates answers based on your
                organization's policies and documentation.
              </p>
            </div>
          </div>
        </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Accepted Files
            </h4>
            <div className="flex flex-col gap-2">
              {[
                { icon: FileText, label: 'PDF', desc: 'Adobe PDF documents' },
                { icon: FileSpreadsheet, label: 'Excel', desc: 'XLS, XLSX spreadsheets' },
                { icon: FileTextIcon, label: 'CSV', desc: 'Comma-separated data' },
              ].map((format, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-xs hover:bg-muted/30 transition-colors"
              >
                <format.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{format.label}</p>
                  <p className="text-xs text-muted-foreground">{format.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 rounded-xs bg-muted/20">
          <p className="text-xs font-medium text-foreground">Quick Tips</p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Files up to 10MB are supported</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Ensure questions are clearly formatted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Structured tables work best</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

