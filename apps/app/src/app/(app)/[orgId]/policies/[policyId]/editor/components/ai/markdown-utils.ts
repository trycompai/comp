import type { JSONContent } from '@tiptap/react';

export function markdownToTipTapJSON(markdown: string): Array<JSONContent> {
  const lines = markdown.split('\n');
  const content: Array<JSONContent> = [];
  let currentList: JSONContent | null = null;
  let listType: 'bulletList' | 'orderedList' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        listType = null;
      }
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        listType = null;
      }
      content.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: [{ type: 'text', text: headingMatch[2] }],
      });
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      if (listType !== 'bulletList') {
        if (currentList) content.push(currentList);
        currentList = { type: 'bulletList', content: [] };
        listType = 'bulletList';
      }
      (currentList!.content as Array<JSONContent>).push({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: bulletMatch[1] }],
          },
        ],
      });
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (listType !== 'orderedList') {
        if (currentList) content.push(currentList);
        currentList = { type: 'orderedList', content: [] };
        listType = 'orderedList';
      }
      (currentList!.content as Array<JSONContent>).push({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: orderedMatch[1] }],
          },
        ],
      });
      continue;
    }

    if (currentList) {
      content.push(currentList);
      currentList = null;
      listType = null;
    }
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: trimmed }],
    });
  }

  if (currentList) {
    content.push(currentList);
  }

  return content.length > 0
    ? content
    : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }];
}
