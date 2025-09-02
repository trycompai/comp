'use client';

import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { FileText, Loader2, UploadCloud } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const [file, setFile] = useState<File | null>(null);
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
      setFile(null);
      router.refresh();
    },
    onError: (error) => toast.error(error.error.serverError || 'Failed to upload PDF.'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  // The file is read as a base64 string on the client before being sent to the server action.
  const handleUpload = () => {
    if (!file) return;
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

  const isUploading = uploadStatus === 'executing';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy Document (PDF View)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pdfUrl ? (
          <div className="space-y-4">
            {isUrlLoading ? (
              <div className="flex h-[800px] w-full items-center justify-center rounded-md border">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : signedUrl ? (
              <iframe
                key={signedUrl}
                src={signedUrl}
                className="h-[800px] w-full rounded-md border"
                title="Policy PDF"
              />
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
              <p className="text-sm text-muted-foreground">
                To replace this PDF, you can upload a new one below.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-md border-2 border-dashed p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No PDF Uploaded</h3>
            <p className="text-sm text-muted-foreground">
              Please upload a PDF document for this policy to continue.
            </p>
          </div>
        )}

        {!isPendingApproval && (
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="max-w-xs"
            />
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {pdfUrl ? 'Re-upload' : 'Upload PDF'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
