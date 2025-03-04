import type { ActionResponse } from "@/actions/types";

export interface UploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
}

export interface FileUploadResponse extends ActionResponse<UploadUrlResponse> {}

export interface UpdateUrlsResponse
  extends ActionResponse<{
    additionalUrls: string[];
  }> {}

export interface DeleteFileResponse extends ActionResponse<null> {}

export interface UploadFileResponse
  extends ActionResponse<{
    fileUrl: string;
  }> {}

export interface EvidenceDetailsProps {
  id: string;
}
