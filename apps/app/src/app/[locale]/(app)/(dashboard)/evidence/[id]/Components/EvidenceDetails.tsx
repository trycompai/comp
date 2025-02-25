"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@bubba/ui/button";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { Skeleton } from "@bubba/ui/skeleton";
import { useOrganizationEvidence } from "../hooks/useOrganizationEvidence";
import { FileSection } from "./FileSection";
import { UrlSection } from "./UrlSection";
import { ReviewSection } from "./ReviewSection";
import { publishEvidence } from "../Actions/publishEvidence";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import type { EvidenceDetailsProps } from "../types";

export function EvidenceDetails({ id }: EvidenceDetailsProps) {
  const router = useRouter();
  const { data, isLoading, error, mutate } = useOrganizationEvidence({ id });

  const { execute: publishAction, isExecuting } = useAction(publishEvidence, {
    onSuccess: () => {
      toast.success("Evidence published successfully");
      mutate();
    },
    onError: () => {
      toast.error("Failed to publish evidence, please try again.");
    },
  });

  useEffect(() => {
    if (error) {
      router.push("/evidence");
    }
  }, [error, router]);

  const handleMutate = async () => {
    await mutate();
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.data) return null;

  const evidence = data.data;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/evidence")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{evidence.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {evidence.published ? (
              <>
                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                <span className="text-sm text-green-600">Published</span>
              </>
            ) : (
              <>
                <XCircle size={16} className="text-red-500 shrink-0" />
                <span className="text-sm text-red-600">Draft</span>
              </>
            )}
          </div>
          {!evidence.published && (
            <Button
              onClick={() => publishAction({ id })}
              disabled={isExecuting}
            >
              {isExecuting ? "Publishing..." : "Publish"}
            </Button>
          )}
        </div>
      </div>

      <ReviewSection
        evidenceId={id}
        lastPublishedAt={evidence.lastPublishedAt}
        frequency={evidence.frequency}
        department={evidence.department || null}
        currentAssigneeId={evidence.assigneeId}
        onSuccess={handleMutate}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="text-lg font-semibold">{evidence.evidence.name}</div>
        </CardHeader>
        <CardContent className="space-y-6">
          {evidence.description && (
            <p className="text-muted-foreground">{evidence.description}</p>
          )}

          <FileSection
            evidenceId={id}
            fileUrls={evidence.fileUrls}
            onSuccess={handleMutate}
          />

          <UrlSection
            evidenceId={id}
            additionalUrls={evidence.additionalUrls}
            onSuccess={handleMutate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
