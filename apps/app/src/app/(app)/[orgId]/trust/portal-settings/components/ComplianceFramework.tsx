'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@trycompai/design-system';
import { CertificateCheck, Download, Upload, View } from '@trycompai/design-system/icons';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  CCPA,
  CCPAInProgress,
  GDPR,
  GDPRInProgress,
  HIPAA,
  HIPAAInProgress,
  ISO27001,
  ISO27001InProgress,
  ISO42001,
  ISO42001InProgress,
  ISO9001,
  ISO9001InProgress,
  NEN7510,
  NEN7510InProgress,
  PCIDSS,
  PCIDSSInProgress,
  PIPEDA,
  PIPEDAInProgress,
  SOC2Type1,
  SOC2Type1InProgress,
  SOC2Type2,
  SOC2Type2InProgress,
  SOC3,
  SOC3InProgress,
} from './logos';

export function ComplianceFrameworkLogo({
  title,
  status,
  enabled,
}: {
  title: string;
  status: string;
  enabled: boolean;
}) {
  const isInProgress = status === 'in_progress';
  let LogoComponent: React.ElementType | null = null;

  if (title === 'ISO 27001') {
    LogoComponent = enabled && isInProgress ? ISO27001InProgress : ISO27001;
  } else if (title === 'ISO 42001') {
    LogoComponent = enabled && isInProgress ? ISO42001InProgress : ISO42001;
  } else if (title === 'GDPR') {
    LogoComponent = enabled && isInProgress ? GDPRInProgress : GDPR;
  } else if (title === 'HIPAA') {
    LogoComponent = enabled && isInProgress ? HIPAAInProgress : HIPAA;
  } else if (title === 'SOC 2 Type 1') {
    LogoComponent = enabled && isInProgress ? SOC2Type1InProgress : SOC2Type1;
  } else if (title === 'SOC 2 Type 2') {
    LogoComponent = enabled && isInProgress ? SOC2Type2InProgress : SOC2Type2;
  } else if (title === 'CCPA') {
    LogoComponent = enabled && isInProgress ? CCPAInProgress : CCPA;
  } else if (title === 'PCI DSS') {
    LogoComponent = enabled && isInProgress ? PCIDSSInProgress : PCIDSS;
  } else if (title === 'PIPEDA') {
    LogoComponent = enabled && isInProgress ? PIPEDAInProgress : PIPEDA;
  } else if (title === 'NEN 7510') {
    LogoComponent = enabled && isInProgress ? NEN7510InProgress : NEN7510;
  } else if (title === 'ISO 9001') {
    LogoComponent = enabled && isInProgress ? ISO9001InProgress : ISO9001;
  } else if (title === 'SOC 3') {
    LogoComponent = enabled && isInProgress ? SOC3InProgress : SOC3;
  } else {
    LogoComponent = null;
  }

  if (LogoComponent) {
    return (
      <div className="h-16 w-16 flex items-center justify-center">
        <LogoComponent className="max-h-full max-w-full" />
      </div>
    );
  }

  // Custom frameworks have no built-in SVG logo — fall back to an initials
  // avatar (same idea as the main Frameworks page).
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted text-lg font-semibold uppercase text-muted-foreground">
      {getFrameworkInitials(title)}
    </div>
  );
}

function getFrameworkInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2);
  return (words[0][0] + words[1][0]).slice(0, 2);
}

// Extracted component for compliance frameworks to reduce repetition and improve readability.
// Exported so the custom-frameworks section can reuse the exact same row UX.
export function ComplianceFramework({
  title,
  description,
  isEnabled: isEnabledProp,
  status: statusProp,
  onStatusChange,
  onToggle,
  fileName,
  onFileUpload,
  onFilePreview,
  frameworkKey,
  orgId,
  disabled,
}: {
  title: string;
  description: string;
  isEnabled: boolean;
  status: string;
  onStatusChange: (value: string) => Promise<void>;
  onToggle: (checked: boolean) => Promise<void>;
  fileName?: string | null;
  onFileUpload?: (file: File, frameworkKey: string) => Promise<void>;
  onFilePreview?: (frameworkKey: string) => Promise<void>;
  frameworkKey: string;
  orgId: string;
  disabled?: boolean;
}) {
  const [isEnabled, setIsEnabled] = useState(isEnabledProp);
  const [status, setStatus] = useState(statusProp);

  // State is optimistic-first, but must follow the parent's data when it
  // refreshes (SWR revalidation, another tab/user) — otherwise the row shows
  // stale enabled/status values forever.
  useEffect(() => {
    setIsEnabled(isEnabledProp);
  }, [isEnabledProp]);
  useEffect(() => {
    setStatus(statusProp);
  }, [statusProp]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 100MB');
      return;
    }

    if (onFileUpload) {
      setIsUploading(true);
      try {
        await onFileUpload(file, frameworkKey);
        toast.success('Certificate uploaded successfully');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload certificate';
        toast.error(message);
        console.error('File upload error:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <ComplianceFrameworkLogo title={title} status={status} enabled={isEnabled} />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <div className="line-clamp-3">
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <div className="mt-4 border-t" />
        <CardContent>
          <div className="flex flex-row items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              {isEnabled ? (
                <Select
                  disabled={disabled}
                  defaultValue={status}
                  value={status}
                  onValueChange={async (value) => {
                    if (!value) return;
                    const prev = status;
                    setStatus(value);
                    try {
                      await onStatusChange(value);
                    } catch {
                      setStatus(prev);
                    }
                  }}
                >
                  <SelectTrigger>
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block h-4 w-4 rounded-sm ${status === 'compliant' ? 'bg-primary' : status === 'in_progress' ? 'bg-yellow-400' : 'bg-gray-300'}`}
                      />
                      {status === 'compliant'
                        ? 'Compliant'
                        : status === 'in_progress'
                          ? 'In Progress'
                          : 'Started'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="started">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 rounded-sm bg-gray-300" />
                        Started
                      </span>
                    </SelectItem>
                    <SelectItem value="in_progress">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 rounded-sm bg-yellow-400" />
                        In Progress
                      </span>
                    </SelectItem>
                    <SelectItem value="compliant">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 rounded-sm bg-primary" />
                        Compliant
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Disabled</span>
                </div>
              )}
            </div>
            <div className="shrink-0 pl-2">
              <Switch
                disabled={disabled}
                checked={isEnabled}
                onCheckedChange={async (checked) => {
                  setIsEnabled(checked);
                  try {
                    await onToggle(checked);
                  } catch {
                    setIsEnabled(!checked);
                  }
                }}
              />
            </div>
          </div>

          {/* File Upload Section - Only show when status is "compliant" */}
          {isEnabled && status === 'compliant' && (
            <div className="mt-4 border-t pt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await processFile(file);
                  }
                }}
                disabled={isUploading || disabled}
              />

              {/* Section Header */}
              <h4 className="text-sm font-semibold text-foreground mb-3">Compliance Certificate</h4>

              {/* Certificate Content */}
              {fileName ? (
                /* File Uploaded State */
                <div className="rounded-lg bg-muted/40 border border-border/50 p-4 space-y-3">
                  <div className="flex items-center gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <CertificateCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
                      <p className="text-xs text-muted-foreground">Certificate uploaded</p>
                    </div>
                    {onFilePreview && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await onFilePreview(frameworkKey);
                                } catch (error) {
                                  const message =
                                    error instanceof Error
                                      ? error.message
                                      : 'Failed to preview certificate';
                                  toast.error(message);
                                }
                              }}
                              className="text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors flex items-center gap-1"
                            />
                          }
                        >
                          <View className="h-3.5 w-3.5" />
                          View
                        </TooltipTrigger>
                        <TooltipContent>Open certificate in new tab</TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || disabled}
                            iconLeft={<Upload className="h-3.5 w-3.5" />}
                          />
                        }
                      >
                        Replace
                      </TooltipTrigger>
                      <TooltipContent>Replace current certificate (PDF)</TooltipContent>
                    </Tooltip>

                    {onFilePreview && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await onFilePreview(frameworkKey);
                                } catch (error) {
                                  const message =
                                    error instanceof Error
                                      ? error.message
                                      : 'Failed to download certificate';
                                  toast.error(message);
                                }
                              }}
                              iconLeft={<Download className="h-3.5 w-3.5" />}
                            />
                          }
                        >
                          Download
                        </TooltipTrigger>
                        <TooltipContent>Download certificate</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ) : (
                /* Empty State - Drop zone matching uploaded state height (122px) */
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
                  className={`
                    relative rounded-lg bg-muted/40 border border-border/50 p-4 cursor-pointer
                    h-[122px] flex items-center
                    transition-all duration-200 ease-in-out
                    ${isDragging ? 'border-primary bg-primary/5' : ''}
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                      flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                      transition-all duration-200
                      ${isDragging ? 'bg-primary/10' : 'bg-background'}
                    `}
                    >
                      <Upload
                        className={`
                        h-5 w-5 transition-all duration-200
                        ${isDragging ? 'text-primary scale-110' : 'text-muted-foreground'}
                      `}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`
                        text-sm font-medium transition-colors duration-200
                        ${isDragging ? 'text-primary' : 'text-foreground'}
                      `}
                      >
                        {isDragging ? 'Drop your certificate here' : 'Drag & drop certificate'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or click to browse • PDF only, max 100MB
                      </p>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Uploading...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
