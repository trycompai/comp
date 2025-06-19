'use client';

import type { JSONContent } from '@tiptap/react';
import { PolicyEditor } from '../../components/policy/PolicyEditor';

interface PolicyViewerProps {
  content: JSONContent | JSONContent[] | unknown;
}

export default function PolicyViewer({ content }: PolicyViewerProps) {
  // Convert content to array format if needed
  let contentArray: JSONContent[];

  if (Array.isArray(content)) {
    contentArray = content as JSONContent[];
  } else if (typeof content === 'object' && content !== null) {
    // If it's a single JSONContent object, wrap it in an array
    contentArray = [content as JSONContent];
  } else {
    // Fallback for string or other formats
    contentArray = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: typeof content === 'string' ? content : 'Policy content not available',
          },
        ],
      },
    ];
  }

  return <PolicyEditor content={contentArray} />;
}
