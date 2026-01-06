'use client';

import type { Member, Policy } from '@db';
import type { JSONContent } from '@tiptap/react';
import { Button, Card, CardContent, CardFooter, CardHeader } from '@trycompai/design-system';
import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { PolicyEditor } from './PolicyEditor';
import { PortalPdfViewer } from './PortalPdfViewer';

interface PolicyCardProps {
  policy: Policy;
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

  const isPdfPolicy = policy.displayFormat === 'PDF';

  return (
    <div className="relative max-h-[calc(100vh-450px)] w-full">
      <Card>
        {isAccepted && (
          <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
            <div className="space-y-4 text-center">
              <Check className="text-primary mx-auto h-12 w-12" />
              <h3 className="text-xl font-semibold">Policy Accepted</h3>
              <p className="text-muted-foreground">You have accepted this policy</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setIsAccepted(false)}>
                  View Again
                </Button>
                {!isLastPolicy && (
                  <Button onClick={onNext}>
                    <span className="inline-flex items-center gap-2">
                      Next Policy
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        <CardHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{policy.name}</h2>
            {policy.description ? (
              <p className="text-sm text-muted-foreground">{policy.description}</p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full border-t pt-6">
            <div className="max-w-none">
              {isPdfPolicy ? (
                <PortalPdfViewer policyId={policy.id} s3Key={policy.pdfUrl} />
              ) : (
                <PolicyEditor content={policy.content as JSONContent[]} />
              )}
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <span>Status: {policy.status}</span>
              {policy.updatedAt ? (
                <span> (Last updated: {new Date(policy.updatedAt).toLocaleDateString()})</span>
              ) : null}
            </div>
          </div>
        </CardContent>
        <CardFooter>
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
    </div>
  );
}
