"use client";

import * as React from "react";

import { revalidateUpload } from "@/actions/risk/task/revalidate-upload";
import { FileUploader } from "@/components/file-uploader";
import { useUploadFile } from "@/hooks/use-upload-file";
import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@bubba/ui/dialog";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

interface UploadDialogProps {
  taskId: string;
  riskId: string;
}

export function UploadDialog({ taskId, riskId }: UploadDialogProps) {
  const t = useI18n();

  const [files, setFiles] = React.useState<File[]>([]);
  const [open, setOpen] = React.useState(false);

  const revalidateTask = useAction(revalidateUpload, {
    onSuccess: () => {
      toast.success("File attached to task successfully");
      setOpen(false);
    },
    onError: () => {
      toast.error("Something went wrong, please try again.");
    },
  });

  const { onUpload, progresses, isUploading } = useUploadFile("uploader", {
    defaultUploadedFiles: [],
    headers: {
      "x-risk-id": riskId,
      "x-task-id": taskId,
    },

    onClientUploadComplete: async () => {
      await revalidateTask.execute({ riskId, taskId });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Upload attachment {files.length > 0 && `(${files.length})`}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("common.attachments.upload")}</DialogTitle>
          <DialogDescription>
            {t("common.attachments.upload_description")}
          </DialogDescription>
        </DialogHeader>
        <FileUploader
          progresses={progresses}
          onUpload={onUpload}
          disabled={isUploading}
          maxFileCount={10}
          maxSize={20 * 1024 * 1024}
          onValueChange={setFiles}
        />
      </DialogContent>
    </Dialog>
  );
}
