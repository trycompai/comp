'use client';

import { apiClient } from '@/app/lib/api-client';
import { Button } from '@trycompai/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { FileUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ImportFrameworkDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface ImportPreview {
  frameworkName: string;
  frameworkVersion: string;
  requirementsCount: number;
  controlTemplatesCount: number;
  policyTemplatesCount: number;
  taskTemplatesCount: number;
}

function parseImportFile(
  json: Record<string, unknown>,
): ImportPreview | string {
  if (typeof json.version !== 'string' || json.version !== '1') {
    return 'Unsupported export format version. Expected version "1".';
  }

  const fw = json.framework as Record<string, unknown> | undefined;
  if (!fw || typeof fw.name !== 'string' || typeof fw.version !== 'string') {
    return 'Invalid file: missing framework name or version.';
  }

  return {
    frameworkName: fw.name,
    frameworkVersion: fw.version,
    requirementsCount: Array.isArray(json.requirements)
      ? json.requirements.length
      : 0,
    controlTemplatesCount: Array.isArray(json.controlTemplates)
      ? json.controlTemplates.length
      : 0,
    policyTemplatesCount: Array.isArray(json.policyTemplates)
      ? json.policyTemplates.length
      : 0,
    taskTemplatesCount: Array.isArray(json.taskTemplates)
      ? json.taskTemplates.length
      : 0,
  };
}

export function ImportFrameworkDialog({
  isOpen,
  onOpenChange,
}: ImportFrameworkDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileData, setFileData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleReset = useCallback(() => {
    setFileData(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setPreview(null);
      setFileData(null);

      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
      if (file.size > MAX_FILE_SIZE) {
        setError('File is too large. Maximum size is 50 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          const result = parseImportFile(json);
          if (typeof result === 'string') {
            setError(result);
          } else {
            setPreview(result);
            setFileData(json);
          }
        } catch {
          setError('Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleImport = useCallback(async () => {
    if (!fileData) {
      return;
    }

    setIsImporting(true);
    try {
      const result = await apiClient('/framework/import', {
        method: 'POST',
        body: JSON.stringify(fileData),
      });
      toast.success('Framework imported successfully!');
      onOpenChange(false);
      handleReset();
      router.refresh();
    } catch (err) {
      console.error('[ImportFramework] Error:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to import framework.';
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  }, [fileData, onOpenChange, handleReset, router]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleReset();
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Framework</DialogTitle>
          <DialogDescription>
            Upload a previously exported framework JSON file to import it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div
            className="border-border hover:border-foreground/30 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-sm">
              {preview
                ? 'Click to choose a different file'
                : 'Click to select a JSON file'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {preview && (
            <div className="bg-muted rounded-md p-4">
              <h4 className="mb-2 font-medium">
                {preview.frameworkName}{' '}
                <span className="text-muted-foreground text-sm font-normal">
                  v{preview.frameworkVersion}
                </span>
              </h4>
              <div className="text-muted-foreground grid grid-cols-2 gap-1 text-sm">
                <span>Requirements:</span>
                <span className="font-mono">
                  {preview.requirementsCount}
                </span>
                <span>Control Templates:</span>
                <span className="font-mono">
                  {preview.controlTemplatesCount}
                </span>
                <span>Policy Templates:</span>
                <span className="font-mono">
                  {preview.policyTemplatesCount}
                </span>
                <span>Task Templates:</span>
                <span className="font-mono">
                  {preview.taskTemplatesCount}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleImport}
            disabled={!fileData || isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Framework'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
