import type { JSONContent } from '@tiptap/react';

const URL_REGEX = /\b(https?:\/\/[^\s)]+|www\.[^\s)]+)\b/gi;

function createLinkMark(href: string) {
  const normalized = href.startsWith('http') ? href : `https://${href}`;
  return {
    type: 'link',
    attrs: {
      href: normalized,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  };
}

function linkifyText(text: string): JSONContent[] {
  const parts: JSONContent[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const [raw] = match;
    const start = match.index;
    const end = start + raw.length;

    if (start > lastIndex) {
      parts.push({ type: 'text', text: text.slice(lastIndex, start) });
    }
    parts.push({ type: 'text', text: raw, marks: [createLinkMark(raw) as any] });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return parts;
}

export function linkifyContent(doc: JSONContent): JSONContent {
  if (!doc || typeof doc !== 'object') return doc;

  const recurse = (node: JSONContent): JSONContent => {
    if (!node) return node;

    if (Array.isArray(node.content)) {
      const newChildren: JSONContent[] = [];
      for (const child of node.content) {
        // Only transform plain text nodes here to avoid complex wrapping
        if (child && child.type === 'text' && typeof child.text === 'string') {
          const hasLink = Array.isArray(child.marks) && child.marks.some((m) => m.type === 'link');
          if (hasLink) {
            newChildren.push(child);
          } else {
            const segments = linkifyText(child.text);
            if (segments.length === 0) {
              newChildren.push(child);
            } else if (
              segments.length === 1 &&
              segments[0]?.text === child.text &&
              !segments[0]?.marks
            ) {
              newChildren.push(child);
            } else {
              newChildren.push(...segments);
            }
          }
        } else {
          newChildren.push(recurse(child as JSONContent));
        }
      }
      return { ...node, content: newChildren } as JSONContent;
    }

    return node;
  };

  return recurse(doc);
}
