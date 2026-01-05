'use client';

import { FileUploader } from '@/components/file-uploader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@comp/ui/alert-dialog';
import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui/card';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

export type TrustPortalDocument = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

interface TrustPortalAdditionalDocumentsSectionProps {
  organizationId: string;
  enabled: boolean;
  documents: TrustPortalDocument[];
}

type UploadTrustPortalDocumentResponse = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

type TrustPortalDocumentDownloadResponse = {
  signedUrl: string;
  fileName: string;
};

export function TrustPortalAdditionalDocumentsSection({
  organizationId,
  enabled,
  documents,
}: TrustPortalAdditionalDocumentsSectionProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(
    null,
  );

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return bDate - aDate;
    });
  }, [documents]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      if (!enabled) return;

      setIsUploading(true);
      const newProgress: Record<string, number> = {};

      try {
        files.forEach((file) => {
          newProgress[file.name] = 0;
        });
        setUploadProgress(newProgress);

        for (const file of files) {
          try {
            const fileData = await fileToBase64(file);
            newProgress[file.name] = 50;
            setUploadProgress({ ...newProgress });

            const response = await api.post<UploadTrustPortalDocumentResponse>(
              '/v1/trust-portal/documents/upload',
              {
                organizationId,
                fileName: file.name,
                fileType: file.type || 'application/octet-stream',
                fileData,
              },
              organizationId,
            );

            if (response.error) {
              throw new Error(response.error || 'Failed to upload file');
            }

            if (response.data?.id) {
              newProgress[file.name] = 100;
              setUploadProgress({ ...newProgress });
              toast.success(`Uploaded ${file.name}`);
            } else {
              throw new Error('Failed to upload file: invalid response');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to upload ${file.name}: ${message}`);
            delete newProgress[file.name];
            setUploadProgress({ ...newProgress });
          }
        }

        router.refresh();
      } finally {
        setIsUploading(false);
        setUploadProgress({});
      }
    },
    [enabled, organizationId, router],
  );

  const handleDownload = useCallback(
    async (documentId: string, fileName: string) => {
      if (downloadingIds.has(documentId)) return;

      setDownloadingIds((prev) => new Set(prev).add(documentId));
      try {
        const response = await api.post<TrustPortalDocumentDownloadResponse>(
          `/v1/trust-portal/documents/${documentId}/download`,
          { organizationId },
          organizationId,
        );

        if (response.error) {
          toast.error(response.error || 'Failed to download file');
          return;
        }

        if (!response.data?.signedUrl) {
          toast.error('Failed to download file: invalid response');
          return;
        }

        const link = document.createElement('a');
        link.href = response.data.signedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Downloading ${fileName}...`);
      } catch (error) {
        console.error('Error downloading trust portal document:', error);
        toast.error('An error occurred while downloading the file');
      } finally {
        setDownloadingIds((prev) => {
          const next = new Set(prev);
          next.delete(documentId);
          return next;
        });
      }
    },
    [downloadingIds, organizationId],
  );

  const handleDeleteClick = (documentId: string, fileName: string) => {
    setDocumentToDelete({ id: documentId, name: fileName });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!documentToDelete) return;

    setDeletingId(documentToDelete.id);
    setIsDeleteDialogOpen(false);

    try {
      const response = await api.post<{ success: boolean }>(
        `/v1/trust-portal/documents/${documentToDelete.id}/delete`,
        { organizationId },
        organizationId,
      );

      if (response.error) {
        toast.error(response.error || 'Failed to delete document');
        return;
      }

      if (response.data?.success) {
        toast.success(`Deleted ${documentToDelete.name}`);
        router.refresh();
      } else {
        toast.error('Failed to delete document: invalid response');
      }
    } catch (error) {
      console.error('Error deleting trust portal document:', error);
      toast.error('An error occurred while deleting the document');
    } finally {
      setDeletingId(null);
      setDocumentToDelete(null);
    }
  }, [documentToDelete, organizationId, router]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Additional Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload any documents you want to make available on your trust portal.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span>{sortedDocuments.length}</span>
        </div>
      </div>

      {!enabled && (
        <div className="mt-4 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Enable the trust portal to upload documents.
        </div>
      )}

      {sortedDocuments.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {sortedDocuments.map((doc) => {
            const isDownloading = downloadingIds.has(doc.id);
            const isDeleting = deletingId === doc.id;

            return (
              <div
                key={doc.id}
                className={`group flex items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/50 hover:border-primary/50 ${
                  isDownloading || isDeleting ? 'opacity-50' : ''
                }`}
              >
                <div
                  className="flex flex-1 cursor-pointer items-center gap-3 min-w-0"
                  onClick={() => !isDownloading && !isDeleting && handleDownload(doc.id, doc.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (isDownloading || isDeleting) return;
                      void handleDownload(doc.id, doc.name);
                    }
                  }}
                  aria-label={`Download ${doc.name}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{doc.name}</h4>
                      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteClick(doc.id, doc.name)}
                  disabled={!enabled || isDeleting || isDownloading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <FileUploader
          onUpload={handleFileUpload}
          multiple={true}
          maxFileCount={10}
          accept={{
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv'],
            'text/plain': ['.txt'],
            'text/markdown': ['.md'],
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/gif': ['.gif'],
            'image/webp': ['.webp'],
            'image/svg+xml': ['.svg'],
          }}
          maxSize={100 * 1024 * 1024}
          disabled={!enabled || isUploading}
          progresses={uploadProgress}
        />
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{documentToDelete?.name}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}


