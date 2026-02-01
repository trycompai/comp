'use client';

import type { Policy, PolicyVersion } from '@db';
import type { JSONContent } from '@tiptap/react';
import { PolicyEditor } from '../../components/policy/PolicyEditor';
import { PortalPdfViewer } from '../../components/policy/PortalPdfViewer';

type PolicyWithVersion = Policy & {
  currentVersion?: Pick<PolicyVersion, 'id' | 'content' | 'pdfUrl' | 'version'> | null;
};

interface PolicyViewerProps {
  policy: PolicyWithVersion;
}

export default function PolicyViewer({ policy }: PolicyViewerProps) {
  // Use currentVersion content/pdfUrl if available, fallback to policy level for backward compatibility
  const effectivePdfUrl = policy.currentVersion?.pdfUrl ?? policy.pdfUrl;
  const effectiveContent = policy.currentVersion?.content ?? policy.content;

  if (policy.displayFormat === 'PDF' && effectivePdfUrl) {
    return (
      <PortalPdfViewer
        policyId={policy.id}
        s3Key={effectivePdfUrl}
        versionId={policy.currentVersion?.id}
      />
    );
  }

  const contentArray = (
    Array.isArray(effectiveContent) ? effectiveContent : [effectiveContent]
  ) as JSONContent[];

  return <PolicyEditor content={contentArray} />;
}
