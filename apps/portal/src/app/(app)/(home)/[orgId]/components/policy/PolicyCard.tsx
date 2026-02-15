'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import type { Member, Policy, PolicyVersion } from '@db';
import type { JSONContent } from '@tiptap/react';
import { Button } from '@trycompai/design-system';
import { ArrowRight, Checkmark } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { PolicyEditor } from './PolicyEditor';
import { PortalPdfViewer } from './PortalPdfViewer';

type PolicyWithVersion = Policy & {
  currentVersion?: Pick<PolicyVersion, 'id' | 'content' | 'pdfUrl' | 'version'> | null;
};

interface PolicyCardProps {
  policy: PolicyWithVersion;
  onNext?: () => void;
  onComplete?: () => void;
  onClick?: () => void;
  member: Member;
  isLastPolicy?: boolean;
}

export function PolicyCard({ policy, onNext, onComplete, member, isLastPolicy }: PolicyCardProps) {
  const [isAccepted, setIsAccepted] = useState(policy.signedBy.includes(member.id));

  const handleAccept = () => {
    setIsAccepted(true);
    onComplete?.();
  };

  // Use currentVersion content/pdfUrl if available, fallback to policy level for backward compatibility
  const effectivePdfUrl = policy.currentVersion?.pdfUrl ?? policy.pdfUrl;
  const effectiveContent = policy.currentVersion?.content ?? policy.content;
  const isPdfPolicy = policy.displayFormat === 'PDF' && effectivePdfUrl;

  return (
    <Card className="relative flex max-h-[calc(100vh-450px)] w-full flex-col shadow-md">
      {isAccepted && (
        <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
          <div className="space-y-4 text-center">
            <Checkmark size={48} className="text-primary mx-auto" />
            <h3 className="text-xl font-semibold">Policy Accepted</h3>
            <p className="text-muted-foreground">You have accepted this policy</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setIsAccepted(false)}>
                View Again
              </Button>
              {!isLastPolicy && (
                <Button onClick={onNext} iconRight={<ArrowRight size={16} />}>
                  Next Policy
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-2xl">{policy.name}</CardTitle>
        <CardDescription className="text-muted-foreground">{policy.description}</CardDescription>
      </CardHeader>
      <CardContent className="w-full flex-1 overflow-y-auto">
        <div className="w-full border-t pt-6">
          <div className="max-w-none">
            {isPdfPolicy ? (
              <PortalPdfViewer
                policyId={policy.id}
                s3Key={effectivePdfUrl}
                versionId={policy.currentVersion?.id}
              />
            ) : (
              <PolicyEditor content={effectiveContent as JSONContent[]} />
            )}
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            Status: {policy.status}{' '}
            {policy.updatedAt && (
              <span>(Last updated: {new Date(policy.updatedAt).toLocaleDateString()})</span>
            )}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {policy.updatedAt && (
            <p className="text-muted-foreground text-sm">
              Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAccept}>Accept Policy</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
