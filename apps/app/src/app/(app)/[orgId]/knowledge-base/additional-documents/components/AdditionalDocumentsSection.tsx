'use client';

import { FileUploader } from '@/components/file-uploader';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
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
import { Card } from '@comp/ui';
import { ChevronLeft, ChevronRight, Download, FileText, Trash2, Upload } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { uploadKnowledgeBaseDocumentAction } from '../actions/upload-document';
import { downloadKnowledgeBaseDocumentAction } from '../actions/download-document';
import { deleteKnowledgeBaseDocumentAction } from '../actions/delete-document';
import { processKnowledgeBaseDocumentsAction } from '../actions/process-documents';
import { useRouter } from 'next/navigation';
import { usePagination } from '../../hooks/usePagination';
import { format } from 'date-fns';

type KnowledgeBaseDocument = Awaited<
  ReturnType<typeof import('../../data/queries').getKnowledgeBaseDocuments>
>[number];

interface AdditionalDocumentsSectionProps {
  organizationId: string;
  documents: Awaited<ReturnType<typeof import('../../data/queries').getKnowledgeBaseDocuments>>;
}

export function AdditionalDocumentsSection({
  organizationId,
  documents,
}: AdditionalDocumentsSectionProps) {
  const router = useRouter();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(
    null,
  );

  const { currentPage, totalPages, paginatedItems, handlePageChange } = usePagination<KnowledgeBaseDocument>({
    items: documents,
    itemsPerPage: 10,
  });

  const handleAccordionChange = (value: string) => {
    // If opening (value is set), scroll to section
    if (value === 'additional-documents' && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100); // Small delay to allow accordion animation to start
    }
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    const newProgress: Record<string, number> = {};

    try {
      // Initialize progress for all files
      files.forEach((file) => {
        newProgress[file.name] = 0;
      });
      setUploadProgress(newProgress);

      const uploadedDocumentIds: string[] = [];

      // Upload files sequentially
      for (const file of files) {
        try {
          // Convert file to base64
          const fileData = await fileToBase64(file);

          // Update progress
          newProgress[file.name] = 50;
          setUploadProgress({ ...newProgress });

          // Upload file
          const result = await uploadKnowledgeBaseDocumentAction({
            fileName: file.name,
            fileType: file.type,
            fileData,
            organizationId,
          });

          if (result?.data?.success && result.data.data?.id) {
            uploadedDocumentIds.push(result.data.data.id);
            newProgress[file.name] = 100;
            setUploadProgress({ ...newProgress });
            toast.success(`Successfully uploaded ${file.name}`);
          } else {
            throw new Error(result?.data?.error || 'Failed to upload file');
          }
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(
            `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          delete newProgress[file.name];
          setUploadProgress({ ...newProgress });
        }
      }

      // Trigger processing for uploaded documents (orchestrator for multiple, individual for single)
      if (uploadedDocumentIds.length > 0) {
        try {
          const result = await processKnowledgeBaseDocumentsAction({
            documentIds: uploadedDocumentIds,
            organizationId,
          });

          if (result?.data?.success) {
            toast.success(result.data.message || 'Processing documents...');
          } else {
            console.error('Failed to trigger document processing:', result?.data?.error);
          }
        } catch (error) {
          console.error('Failed to trigger document processing:', error);
        }
      }

      // Refresh the page to show new documents
      router.refresh();
    } catch (error) {
      console.error('Error during file upload:', error);
      toast.error('An error occurred during file upload');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleDownload = async (documentId: string, fileName: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (downloadingIds.has(documentId)) {
      return;
    }

    setDownloadingIds((prev) => new Set(prev).add(documentId));

    try {
      const result = await downloadKnowledgeBaseDocumentAction({ documentId });

      if (result?.data?.success && result.data.data?.signedUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = result.data.data.signedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Downloading ${fileName}...`);
      } else {
        toast.error(result?.data?.error || 'Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('An error occurred while downloading the file');
    } finally {
      setDownloadingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const handleDeleteClick = (documentId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete({ id: documentId, name: fileName });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setDeletingId(documentToDelete.id);
    setIsDeleteDialogOpen(false);

    try {
      const result = await deleteKnowledgeBaseDocumentAction({
        documentId: documentToDelete.id,
      });

      if (result?.data?.success) {
        toast.success(`Successfully deleted ${documentToDelete.name}`);
        router.refresh();
      } else {
        toast.error(result?.data?.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('An error occurred while deleting the document');
    } finally {
      setDeletingId(null);
      setDocumentToDelete(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <>
      <Card ref={sectionRef} id="additional-documents">
        <Accordion type="single" collapsible className="w-full" onValueChange={handleAccordionChange}>
          <AccordionItem value="additional-documents" className="border-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-base font-semibold">Additional Documents</span>
                <span className="text-sm text-muted-foreground">({documents.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Upload documents or images to enhance your knowledge base. Supported formats: PDF, Word (.docx), Excel, CSV, text files, and images (PNG, JPG, GIF, WebP, SVG). Click on a document to download it.
                </p>
              </div>

              {/* Documents List */}
              {documents.length > 0 && (
                <div className="mb-4 flex flex-col gap-2">
                  {paginatedItems.map((document: KnowledgeBaseDocument) => {
                    const isDownloading = downloadingIds.has(document.id);
                    const isDeleting = deletingId === document.id;
                    const formattedDate = format(new Date(document.createdAt), 'MMM dd, yyyy');

                    return (
                      <div
                        key={document.id}
                        className={`group flex items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/50 hover:border-primary/50 ${
                          isDownloading || isDeleting ? 'opacity-50' : ''
                        }`}
                      >
                        <div
                          onClick={() => !isDownloading && !isDeleting && handleDownload(document.id, document.name)}
                          className="flex flex-1 cursor-pointer items-center gap-3 min-w-0"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground truncate">
                                {document.name}
                              </h4>
                              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              <span>{formattedDate}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(document.id, document.name, e)}
                          disabled={isDeleting || isDownloading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* File Uploader */}
              <FileUploader
                onUpload={handleFileUpload}
                multiple={true}
                maxFileCount={10}
                accept={{
                  'application/pdf': ['.pdf'],
                  'application/msword': ['.doc'],
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
                    '.docx',
                  ],
                  'text/plain': ['.txt'],
                  'text/markdown': ['.md'],
                  'image/png': ['.png'],
                  'image/jpeg': ['.jpg', '.jpeg'],
                  'image/gif': ['.gif'],
                  'image/webp': ['.webp'],
                  'image/svg+xml': ['.svg'],
                }}
                maxSize={10 * 1024 * 1024} // 10MB
                disabled={isUploading}
                progresses={uploadProgress}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-end">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[80px] text-center">
                      {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{documentToDelete?.name}&quot;? This action cannot be undone.
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
    </>
  );
}
