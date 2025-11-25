'use client';

import type { Policy } from '@db';
import type { JSONContent } from '@tiptap/react';
import { PolicyEditor } from '../../components/policy/PolicyEditor';
import { PortalPdfViewer } from '../../components/policy/PortalPdfViewer';

interface PolicyViewerProps {
  policy: Policy;
}

export default function PolicyViewer({ policy }: PolicyViewerProps) {
  if (policy.displayFormat === 'PDF') {
    return <PortalPdfViewer policyId={policy.id} s3Key={policy.pdfUrl} />;
  }

  const contentArray = (
    Array.isArray(policy.content) ? policy.content : [policy.content]
  ) as JSONContent[];

  return <PolicyEditor content={contentArray} />;
}
