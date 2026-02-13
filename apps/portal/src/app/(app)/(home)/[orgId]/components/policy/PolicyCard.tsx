'use client';

import type { Member, Policy, PolicyVersion } from '@db';
import type { JSONContent } from '@tiptap/react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Text,
} from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
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
    <div className="relative">
      <Card>
      {isAccepted && (
        <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
          <div className="space-y-4 text-center">
            <Text weight="medium">Policy Accepted</Text>
            <Text variant="muted">You have accepted this policy</Text>
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
        <CardTitle>{policy.name}</CardTitle>
        <CardDescription>{policy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full border-t border-border pt-6">
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
          <Text variant="muted" size="sm">
            Status: {policy.status}{' '}
            {policy.updatedAt && (
              <span>(Last updated: {new Date(policy.updatedAt).toLocaleDateString()})</span>
            )}
          </Text>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {policy.updatedAt && (
              <Text variant="muted" size="sm">
                Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
              </Text>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAccept}>Accept Policy</Button>
          </div>
        </div>
      </CardFooter>
      </Card>
    </div>
  );
}
