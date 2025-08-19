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

    if (node.type === 'text' && typeof node.text === 'string') {
      // If it already has a link mark, leave as-is
      const hasLink = Array.isArray(node.marks) && node.marks.some((m) => m.type === 'link');
      if (hasLink) return node;
      const segments = linkifyText(node.text);
      // If no links detected, return original
      if (segments.length === 1 && segments[0].text === node.text && !segments[0].marks) {
        return node;
      }
      return { type: 'text', text: '', content: segments } as any; // handled by parent rewrite below
    }

    if (Array.isArray(node.content)) {
      const newChildren: JSONContent[] = [];
      for (const child of node.content) {
        const next = recurse(child);
        // If a text node returned a wrapper with inline content, flatten it
        if (next && (next as any).content && next.type === 'text' && next.text === '') {
          newChildren.push(...(((next as any).content as JSONContent[]) || []));
        } else {
          newChildren.push(next);
        }
      }
      return { ...node, content: newChildren };
    }

    return node;
  };

  return recurse(doc);
}
