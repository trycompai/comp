"use client";

import useSWR from "swr";
import { getPolicyDetails } from "../../[policyId]/editor/actions/get-policy-details";
import { updatePolicy } from "../../[policyId]/editor/actions/update-policy";
import type { AppError, PolicyDetails } from "../../[policyId]/editor/types";

interface ContentNode {
  type: string;
  content?: ContentNode[];
  text?: string;
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  [key: string]: any;
}

async function fetchPolicyDetails(policyId: string): Promise<PolicyDetails> {
  const result = await getPolicyDetails({
    policyId,
    _cache: Date.now(),
  });

  if (!result) {
    const error: AppError = {
      code: "UNEXPECTED_ERROR",
      message: "An unexpected error occurred",
    };
    throw error;
  }

  if (result.serverError) {
    const error: AppError = {
      code: "UNEXPECTED_ERROR",
      message: result.serverError || "An unexpected error occurred",
    };
    throw error;
  }

  return result.data?.data as PolicyDetails;
}

export function usePolicyDetails(policyId: string) {
  const { data, error, isLoading, mutate } = useSWR<PolicyDetails, AppError>(
    ["policy-details", policyId],
    () => fetchPolicyDetails(policyId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: true,
      dedupingInterval: 0,
    },
  );

  const updatePolicyContent = async (updateData: Partial<PolicyDetails>) => {
    try {
      const { content, status } = updateData;
      const processedContent = JSON.parse(
        JSON.stringify(processContent(content as unknown as ContentNode)),
      );

      const result = await updatePolicy({
        policyId,
        content: processedContent || undefined,
        status: status || undefined,
      });

      await mutate(fetchPolicyDetails(policyId), {
        revalidate: true,
        populateCache: true,
        rollbackOnError: false,
      });

      return true;
    } catch (error) {
      console.error("Error updating policy:", error);
      return false;
    }
  };

  return {
    policy: data,
    isLoading,
    error,
    updatePolicy: updatePolicyContent,
    refreshPolicy: () => mutate(fetchPolicyDetails(policyId), true),
  };
}

function processContent(
  content: ContentNode | ContentNode[],
): ContentNode | ContentNode[] {
  if (!content) return content;

  // Handle arrays
  if (Array.isArray(content)) {
    return content.map((node) => processContent(node) as ContentNode);
  }

  const processed: ContentNode = {
    type: content.type,
  };

  if (content.text !== undefined) {
    processed.text = content.text;
  }

  if (content.attrs) {
    processed.attrs = { ...content.attrs };
  }

  if (content.marks) {
    processed.marks = content.marks.map((mark) => ({
      type: mark.type,
      ...(mark.attrs && { attrs: { ...mark.attrs } }),
    }));
  }

  if (content.content) {
    processed.content = processContent(content.content) as ContentNode[];
  }

  return processed;
}
