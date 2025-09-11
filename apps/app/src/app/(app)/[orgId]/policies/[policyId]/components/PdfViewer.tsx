'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { cn } from '@comp/ui/cn';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Dropzone from 'react-dropzone';
import { toast } from 'sonner';
import { getPolicyPdfUrlAction } from '../actions/get-policy-pdf-url';
import { uploadPolicyPdfAction } from '../actions/upload-policy-pdf';

interface PdfViewerProps {
  policyId: string;
  pdfUrl?: string | null; // This prop contains the S3 Key
  isPendingApproval: boolean;
}

export function PdfViewer({ policyId, pdfUrl, isPendingApproval }: PdfViewerProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isUrlLoading, setUrlLoading] = useState(true);

  const { execute: getUrl } = useAction(getPolicyPdfUrlAction, {
    onSuccess: (result) => {
      const url = result?.data?.data ?? null;
      if (result?.data?.success && url) {
        setSignedUrl(url);
      } else {
        setSignedUrl(null);
      }
    },
    onError: () => toast.error('Could not load the policy document.'),
    onSettled: () => setUrlLoading(false),
  });

  // Fetch the secure, temporary URL when the component loads with an S3 key.
  useEffect(() => {
    if (pdfUrl) {
      getUrl({ policyId });
    } else {
      setUrlLoading(false);
    }
  }, [pdfUrl, policyId, getUrl]);

  const { execute: upload, status: uploadStatus } = useAction(uploadPolicyPdfAction, {
    onSuccess: () => {
      toast.success('PDF uploaded successfully.');
      setFiles([]);
      router.refresh();
    },
    onError: (error) => toast.error(error.error.serverError || 'Failed to upload PDF.'),
  });

  // Handle file upload from FileUploader component
  const handleUpload = async (uploadFiles: File[]) => {
    if (!uploadFiles.length) return;
    const file = uploadFiles[0]; // Only handle first file since we accept single files

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      upload({
        policyId,
        fileName: file.name,
        fileType: file.type,
        fileData: base64Data,
      });
    };
    reader.onerror = () => toast.error('Failed to read the file for uploading.');
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

  const isUploading = uploadStatus === 'executing';

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {signedUrl ? (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline cursor-pointer flex items-center gap-2"
            >
              {pdfUrl?.split('/').pop()}
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            pdfUrl?.split('/').pop()
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                <FileText className="h-12 w-12 text-destructive" />
                <p className="mt-4 font-semibold">Could not load PDF</p>
                <p className="text-sm text-muted-foreground">
                  The document might be missing or there was a problem retrieving it.
                </p>
              </div>
            )}
            {!isPendingApproval && (
              <Dropzone
                onDrop={handleMainCardDrop}
                accept={{ 'application/pdf': [] }}
                maxSize={100 * 1024 * 1024}
                maxFiles={1}
                multiple={false}
                disabled={isUploading}
              >
                {({ getRootProps, getInputProps, isDragActive }) => (
                  <div
                    {...getRootProps()}
                    className={cn(
                      'cursor-pointer rounded-md border-2 border-dashed p-4 text-center transition-colors',
                      isDragActive
                        ? 'border-primary bg-primary/10 dark:border-primary dark:bg-primary/10'
                        : 'border-primary/30 hover:border-primary/50 dark:border-primary/30 dark:hover:border-primary/50',
                      isUploading && 'pointer-events-none opacity-60',
                    )}
                  >
                    <input {...getInputProps()} />
                    <p className="text-sm text-muted-foreground">
                      {isUploading
                        ? 'Uploading new PDF...'
                        : isDragActive
                          ? 'Drop your new PDF here to replace the current one'
                          : 'Drag and drop a new PDF here to replace the current one, or click to browse (up to 100MB)'}
                    </p>
                  </div>
                )}
              </Dropzone>
            )}
          </div>
        ) : !isPendingApproval ? (
          <Dropzone
            onDrop={handleMainCardDrop}
            accept={{ 'application/pdf': [] }}
            maxSize={100 * 1024 * 1024}
            maxFiles={1}
            multiple={false}
            disabled={isUploading}
          >
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div
                {...getRootProps()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center space-y-4 rounded-md border-2 border-dashed p-12 text-center transition-colors',
                  isDragActive
                    ? 'border-primary bg-primary/10 dark:border-primary dark:bg-primary/10'
                    : 'border-primary/30 hover:border-primary/50 dark:border-primary/30 dark:hover:border-primary/50',
                  isUploading && 'pointer-events-none opacity-60',
                )}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                ) : (
                  <FileText className="h-12 w-12 text-primary" />
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
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No PDF Uploaded</h3>
            <p className="text-sm text-muted-foreground">
              A PDF document is required for this policy.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
