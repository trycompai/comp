'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@trycompai/design-system';
import {
  DocumentPdf,
  Launch,
  OverflowMenuVertical,
  TrashCan,
  Upload,
} from '@trycompai/design-system/icons';
import { Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import Dropzone from 'react-dropzone';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { useApiSWR } from '@/hooks/use-api-swr';

interface PdfViewerProps {
  policyId: string;
  versionId?: string; // The version ID for version-specific operations
  pdfUrl?: string | null; // This prop contains the S3 Key
  isPendingApproval: boolean;
  /** Whether the current version is read-only (published or pending) */
  isVersionReadOnly?: boolean;
  /** Whether viewing the currently active/published version */
  isViewingActiveVersion?: boolean;
  /** Whether viewing a version pending approval */
  isViewingPendingVersion?: boolean;
  onMutate?: () => void;
}

export function PdfViewer({
  policyId,
  versionId,
  pdfUrl,
  isPendingApproval,
  isVersionReadOnly = false,
  isViewingActiveVersion = false,
  isViewingPendingVersion = false,
  onMutate
}: PdfViewerProps) {
  // Combine both checks - can't modify if pending approval OR version is read-only
  const isReadOnly = isPendingApproval || isVersionReadOnly;
  const { post, delete: apiDelete } = useApi();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the secure, temporary URL when the component loads with an S3 key.
  const signedUrlEndpoint = pdfUrl
    ? `/v1/policies/${policyId}/pdf/signed-url${versionId ? `?versionId=${versionId}` : ''}`
    : null;
  const { data: signedUrlResponse, isLoading: isUrlLoading, mutate: mutateSignedUrl } = useApiSWR<{ url: string }>(
    signedUrlEndpoint,
  );
  const signedUrl = signedUrlResponse?.data?.url ?? null;

  const handleReplaceClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const file = selectedFiles[0];
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }
      handleUpload([file]);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file upload from FileUploader component
  const handleUpload = async (uploadFiles: File[]) => {
    if (!uploadFiles.length) return;
    const file = uploadFiles[0]; // Only handle first file since we accept single files

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      setIsUploading(true);
      try {
        const response = await post(`/v1/policies/${policyId}/pdf/upload`, {
          versionId,
          fileName: file.name,
          fileType: file.type,
          fileData: base64Data,
        });
        if (response.error) throw new Error(response.error);
        toast.success('PDF uploaded successfully.');
        onMutate?.();
      } catch {
        toast.error('Failed to upload PDF.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => toast.error('Failed to read the file for uploading.');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setIsDeleteDialogOpen(false);
    try {
      const params = new URLSearchParams();
      if (versionId) params.set('versionId', versionId);
      const qs = params.toString();
      const response = await apiDelete(`/v1/policies/${policyId}/pdf${qs ? `?${qs}` : ''}`);
      if (response.error) throw new Error(response.error);
      toast.success('PDF deleted successfully.');
      mutateSignedUrl(undefined);
      onMutate?.();
    } catch {
      toast.error('Failed to delete PDF.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle direct drop on main card area
  const handleMainCardDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error('No valid PDF file selected');
      return;
    }

    if (acceptedFiles.length > 1) {
      toast.error('Please upload only one PDF file at a time');
      return;
    }

    const file = acceptedFiles[0];
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB');
      return;
    }

    handleUpload(acceptedFiles);
  };

  const fileName = pdfUrl?.split('/').pop() || '';
  const MAX_FILENAME_LENGTH = 50;
  const truncatedFileName =
    fileName.length > MAX_FILENAME_LENGTH
      ? `${fileName.substring(0, MAX_FILENAME_LENGTH)}...`
      : fileName;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle>
              {signedUrl ? (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline cursor-pointer flex items-center gap-2 min-w-0"
                  title={fileName}
                >
                  <span className="truncate">{truncatedFileName}</span>
                  <Launch size={16} className="shrink-0" />
                </a>
              ) : (
                <span className="truncate" title={fileName}>
                  {truncatedFileName}
                </span>
              )}
            </CardTitle>
          </div>
          {pdfUrl && !isReadOnly && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isUploading || isDeleting}
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  variant="ellipsis"
                  disabled={isUploading || isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <OverflowMenuVertical size={16} />
                  )}
                  <span className="sr-only">Open menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleReplaceClick}
                    disabled={isUploading || isDeleting}
                  >
                    <Upload size={16} />
                    Replace
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={isUploading || isDeleting}
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <TrashCan size={16} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete PDF?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this PDF? This action cannot be undone.
                      The policy will switch back to Editor View.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      variant="destructive"
                      loading={isDeleting}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
        {isVersionReadOnly && pdfUrl && (
          <div className="flex items-center gap-4 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
            <span>
              {isViewingPendingVersion
                ? 'This version is pending approval and cannot be edited.'
                : isViewingActiveVersion
                  ? 'This version is published. Create a new version to make changes.'
                  : 'This version cannot be edited.'}
            </span>
          </div>
        )}
        {pdfUrl ? (
          <div className="space-y-4">
            {isUrlLoading ? (
              <div className="flex h-[800px] w-full items-center justify-center rounded-md border">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : signedUrl ? (
              <div className="relative">
                <iframe
                  key={signedUrl}
                  src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="h-[800px] w-full rounded-md border"
                  title="Policy PDF"
                  onError={() => {
                    console.error('PDF failed to load in iframe, trying fallback');
                  }}
                />
              </div>
            ) : (
              <div className="flex h-[800px] w-full flex-col items-center justify-center rounded-md border text-center">
                <DocumentPdf size={48} className="text-destructive" />
                <p className="mt-4 font-semibold">Could not load PDF</p>
                <p className="text-sm text-muted-foreground">
                  The document might be missing or there was a problem retrieving it.
                </p>
              </div>
            )}
            {!isReadOnly && (
              <Dropzone
                onDrop={handleMainCardDrop}
                accept={{ 'application/pdf': [] }}
                maxSize={100 * 1024 * 1024}
                maxFiles={1}
                multiple={false}
                disabled={isUploading || isDeleting}
              >
                {({ getRootProps, getInputProps, isDragActive }) => (
                  <div
                    {...getRootProps()}
                    className={cn(
                      'cursor-pointer rounded-md border-2 border-dashed p-4 text-center transition-colors',
                      isDragActive
                        ? 'border-primary bg-primary/10 dark:border-primary dark:bg-primary/10'
                        : 'border-primary/30 hover:border-primary/50 dark:border-primary/30 dark:hover:border-primary/50',
                      (isUploading || isDeleting) && 'pointer-events-none opacity-60',
                    )}
                  >
                    <input {...getInputProps()} />
                    <p className="text-sm text-muted-foreground">
                      {isUploading
                        ? 'Uploading new PDF...'
                        : isDeleting
                          ? 'Deleting PDF...'
                          : isDragActive
                            ? 'Drop your new PDF here to replace the current one'
                            : 'Drag and drop a new PDF here to replace the current one, or click to browse (up to 100MB)'}
                    </p>
                  </div>
                )}
              </Dropzone>
            )}
          </div>
        ) : !isReadOnly ? (
          <Dropzone
            onDrop={handleMainCardDrop}
            accept={{ 'application/pdf': [] }}
            maxSize={100 * 1024 * 1024}
            maxFiles={1}
            multiple={false}
            disabled={isUploading || isDeleting}
          >
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div
                {...getRootProps()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center space-y-4 rounded-md border-2 border-dashed p-12 text-center transition-colors',
                  isDragActive
                    ? 'border-primary bg-primary/10 dark:border-primary dark:bg-primary/10'
                    : 'border-primary/30 hover:border-primary/50 dark:border-primary/30 dark:hover:border-primary/50',
                  (isUploading || isDeleting) && 'pointer-events-none opacity-60',
                )}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                ) : (
                  <DocumentPdf size={48} className="text-primary" />
                )}
                <h3 className="text-lg font-semibold">
                  {isUploading
                    ? 'Uploading PDF...'
                    : isDragActive
                      ? 'Drop your PDF here'
                      : 'No PDF Uploaded'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isUploading
                    ? 'Please wait while we upload your PDF.'
                    : isDragActive
                      ? 'Release to upload your PDF.'
                      : 'Drag and drop a PDF here or click to browse (up to 100MB)'}
                </p>
              </div>
            )}
          </Dropzone>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-md border-2 border-dashed border-muted p-12 text-center">
            <DocumentPdf size={48} className="text-muted-foreground" />
            <h3 className="text-lg font-semibold">No PDF Uploaded</h3>
            <p className="text-sm text-muted-foreground">
              {isReadOnly
                ? 'This version does not have a PDF document. The policy content is displayed in the Editor view.'
                : 'No PDF has been uploaded for this policy. Upload a PDF to display it here, or use the Editor view to edit content.'}
            </p>
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  );
}
