'use client';

import { FileUploader } from '@/components/file-uploader';
import { usePermissions } from '@/hooks/use-permissions';
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
import { ChevronLeft, ChevronRight, Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { usePagination } from '../../hooks/usePagination';
import { format } from 'date-fns';
import { useDocumentProcessing } from '../hooks/useDocumentProcessing';
import { useKnowledgeBaseDocs } from '../../../hooks/useKnowledgeBaseDocs';
import type { KBDocument } from '../../../components/types';

interface ActiveRun {
  runId: string;
  token: string;
  documentIds: string[];
}

interface AdditionalDocumentsSectionProps {
  organizationId: string;
  documents: KBDocument[];
}

export function AdditionalDocumentsSection({
  organizationId,
  documents: initialDocuments,
}: AdditionalDocumentsSectionProps) {
  const { hasPermission } = usePermissions();
  const canManageQuestionnaire = hasPermission('questionnaire', 'create');
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [activeProcessingRun, setActiveProcessingRun] = useState<ActiveRun | null>(null);
  const [activeDeletionRun, setActiveDeletionRun] = useState<ActiveRun | null>(null);

  const {
    documents,
    uploadDocument,
    processDocuments,
    deleteDocument,
    downloadDocument,
    revalidate,
  } = useKnowledgeBaseDocs({ organizationId, fallbackData: initialDocuments });

  const handleProcessingComplete = useCallback(() => {
    setActiveProcessingRun(null);
    void revalidate();
    toast.success('Document processing completed');
  }, [revalidate]);

  const handleDeletionComplete = useCallback(() => {
    setActiveDeletionRun(null);
  }, []);

  const { isProcessing, isDeleting } = useDocumentProcessing({
    processingRunId: activeProcessingRun?.runId || null,
    processingToken: activeProcessingRun?.token || null,
    deletionRunId: activeDeletionRun?.runId || null,
    deletionToken: activeDeletionRun?.token || null,
    onProcessingComplete: handleProcessingComplete,
    onDeletionComplete: handleDeletionComplete,
  });

  const { currentPage, totalPages, paginatedItems, handlePageChange } = usePagination<KBDocument>({
    items: documents,
    itemsPerPage: 10,
  });

  const handleAccordionChange = (value: string) => {
    if (value === 'additional-documents' && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

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

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    const newProgress: Record<string, number> = {};

    try {
      files.forEach((file) => { newProgress[file.name] = 0; });
      setUploadProgress(newProgress);

      const uploadedDocumentIds: string[] = [];

      for (const file of files) {
        try {
          const fileData = await fileToBase64(file);
          newProgress[file.name] = 50;
          setUploadProgress({ ...newProgress });

          const result = await uploadDocument(file.name, file.type, fileData);
          uploadedDocumentIds.push(result.id);
          newProgress[file.name] = 100;
          setUploadProgress({ ...newProgress });
          toast.success(`Successfully uploaded ${file.name}`);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          delete newProgress[file.name];
          setUploadProgress({ ...newProgress });
        }
      }

      if (uploadedDocumentIds.length > 0) {
        try {
          const processResult = await processDocuments(uploadedDocumentIds);
          if (processResult.success && processResult.runId && processResult.publicAccessToken) {
            setActiveProcessingRun({
              runId: processResult.runId,
              token: processResult.publicAccessToken,
              documentIds: uploadedDocumentIds,
            });
            toast.success(processResult.message || 'Processing documents...');
          }
        } catch (error) {
          console.error('Failed to trigger document processing:', error);
        }
      }

      await revalidate();
    } catch (error) {
      console.error('Error during file upload:', error);
      toast.error('An error occurred during file upload');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleDownload = async (documentId: string, fileName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (downloadingIds.has(documentId)) return;

    setDownloadingIds((prev) => new Set(prev).add(documentId));
    try {
      const result = await downloadDocument(documentId);
      const link = document.createElement('a');
      link.href = result.signedUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${fileName}...`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while downloading the file');
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
      const result = await deleteDocument(documentToDelete.id);
      if (result.vectorDeletionRunId && result.publicAccessToken) {
        setActiveDeletionRun({
          runId: result.vectorDeletionRunId,
          token: result.publicAccessToken,
          documentIds: [documentToDelete.id],
        });
      }
      toast.success(`Successfully deleted ${documentToDelete.name}`);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while deleting the document');
    } finally {
      setDeletingId(null);
      setDocumentToDelete(null);
    }
  };

  const isDocumentProcessing = (docId: string) => {
    return activeProcessingRun?.documentIds.includes(docId) && isProcessing;
  };

  const isDocumentDeletingVectors = (docId: string) => {
    return activeDeletionRun?.documentIds.includes(docId) && isDeleting;
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
              <DocumentListInfo />
              {documents.length > 0 && (
                <DocumentList
                  paginatedItems={paginatedItems}
                  downloadingIds={downloadingIds}
                  deletingId={deletingId}
                  isDocumentProcessing={isDocumentProcessing}
                  isDocumentDeletingVectors={isDocumentDeletingVectors}
                  onDownload={handleDownload}
                  onDeleteClick={handleDeleteClick}
                  canDelete={canManageQuestionnaire}
                />
              )}
              {canManageQuestionnaire && (
                <FileUploader
                  onUpload={handleFileUpload}
                  multiple={true}
                  maxFileCount={10}
                  accept={ACCEPTED_FILE_TYPES}
                  maxSize={100 * 1024 * 1024}
                  disabled={isUploading}
                  progresses={uploadProgress}
                />
              )}
              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

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

const ACCEPTED_FILE_TYPES = {
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
};

function DocumentListInfo() {
  return (
    <div className="mb-6 space-y-2">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Upload documents or images to enhance your knowledge base.
      </p>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Supported Formats
        </p>
        <p className="text-xs text-muted-foreground/90 leading-relaxed">
          PDF, Word (.doc, .docx), Excel (.xlsx, .xls), CSV, text files (.txt, .md), and images (PNG, JPG, GIF, WebP, SVG)
        </p>
      </div>
    </div>
  );
}

function DocumentList({
  paginatedItems,
  downloadingIds,
  deletingId,
  isDocumentProcessing,
  isDocumentDeletingVectors,
  onDownload,
  onDeleteClick,
  canDelete,
}: {
  paginatedItems: KBDocument[];
  downloadingIds: Set<string>;
  deletingId: string | null;
  isDocumentProcessing: (id: string) => boolean | undefined;
  isDocumentDeletingVectors: (id: string) => boolean | undefined;
  onDownload: (id: string, name: string, e?: React.MouseEvent) => void;
  onDeleteClick: (id: string, name: string, e: React.MouseEvent) => void;
  canDelete: boolean;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      {paginatedItems.map((doc) => {
        const isDownloading = downloadingIds.has(doc.id);
        const isItemDeleting = deletingId === doc.id;
        const isProcessingDoc = isDocumentProcessing(doc.id);
        const isDeletingVector = isDocumentDeletingVectors(doc.id);
        const formattedDate = format(new Date(doc.createdAt), 'MMM dd, yyyy');

        return (
          <div
            key={doc.id}
            className={`group flex flex-col gap-2 rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/50 hover:border-primary/50 ${
              isDownloading || isItemDeleting ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                onClick={() => !isDownloading && !isItemDeleting && onDownload(doc.id, doc.name)}
                className="flex flex-1 cursor-pointer items-center gap-3 min-w-0"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground truncate">{doc.name}</h4>
                    <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>
              {(isProcessingDoc || isDeletingVector) ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : canDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => onDeleteClick(doc.id, doc.name, e)}
                  disabled={isItemDeleting || isDownloading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-end">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
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
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
