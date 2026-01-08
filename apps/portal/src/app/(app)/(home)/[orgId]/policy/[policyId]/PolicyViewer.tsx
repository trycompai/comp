'use client';

import type { JSONContent } from '@tiptap/react';
import { PolicyEditor } from '../../components/policy/PolicyEditor';
import { PortalPdfViewer } from '../../components/policy/PortalPdfViewer';

type PolicyViewerPolicy = {
  id: string;
  displayFormat?: string | null;
  pdfUrl?: string | null;
  content?: unknown;
};

interface PolicyViewerProps {
  policy: PolicyViewerPolicy;
}

const isJsonContent = (value: unknown): value is JSONContent => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { type?: unknown; text?: unknown; content?: unknown };
  return (
    (typeof v.type === 'string' && v.type.length > 0) ||
    typeof v.text === 'string' ||
    Array.isArray(v.content)
  );
};

export default function PolicyViewer({ policy }: PolicyViewerProps) {
  if (policy.displayFormat === 'PDF' && policy.pdfUrl) {
    return <PortalPdfViewer policyId={policy.id} s3Key={policy.pdfUrl} />;
  }

  const contentArray: JSONContent[] = Array.isArray(policy.content)
    ? policy.content.filter(isJsonContent)
    : isJsonContent(policy.content)
      ? [policy.content]
      : [];

  if (contentArray.length === 0) {
    return <p className="text-sm text-muted-foreground">No policy content available.</p>;
  }

  return <PolicyEditor content={contentArray} />;
}
