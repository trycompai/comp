"use client";

import { useCallback, useState } from "react";
import { useToast } from "@bubba/ui/use-toast";
import { getEvidenceFileUrl } from "../actions/getEvidenceFileUrl";

interface UseFilePreviewProps {
  evidenceId: string;
}

interface UseFilePreviewReturn {
  isLoading: boolean;
  getPreviewUrl: (fileUrl: string) => Promise<string>;
}

interface ActionResponse {
  signedUrl: string;
}

export function useFilePreview({
  evidenceId,
}: UseFilePreviewProps): UseFilePreviewReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const getPreviewUrl = useCallback(
    async (fileUrl: string): Promise<string> => {
      setIsLoading(true);
      try {
        const response = await getEvidenceFileUrl({
          evidenceId,
          fileUrl,
        });

        console.log("Preview URL response:", response);

        if (!response?.data) {
          throw new Error("Failed to get signed URL");
        }

        const result = response.data as ActionResponse;
        if (!result.signedUrl) {
          throw new Error("Invalid signed URL response");
        }

        return result.signedUrl;
      } catch (error) {
        console.error("Error getting file URL:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load file preview";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [evidenceId, toast]
  );

  return {
    isLoading,
    getPreviewUrl,
  };
}
