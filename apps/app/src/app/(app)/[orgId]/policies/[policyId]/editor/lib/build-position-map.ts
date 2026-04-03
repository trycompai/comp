import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { PositionMap } from './suggestion-types';

export function buildPositionMap(doc: ProseMirrorNode): PositionMap {
  const lineToPos = new Map<number, { from: number; to: number }>();
  const markdownLines: string[] = [];

  // First pass: collect all nodes with their positions and markdown representations
  const entries: Array<{
    type: 'heading' | 'paragraph' | 'list-item' | 'other';
    markdown: string;
    from: number;
    to: number;
  }> = [];

  doc.forEach((node, offset) => {
    const nodeFrom = offset + 1; // +1 because doc node itself takes position 0

    if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
      node.forEach((listItem, childOffset) => {
        const itemFrom = nodeFrom + 1 + childOffset;
        const itemTo = itemFrom + listItem.nodeSize;
        const text = extractText(listItem);
        entries.push({ type: 'list-item', markdown: '- ' + text, from: itemFrom, to: itemTo });
      });
      return;
    }

    const nodeTo = nodeFrom + node.nodeSize - 2;

    if (node.type.name === 'heading') {
      const level = (node.attrs.level as number) || 1;
      const text = extractText(node);
      entries.push({ type: 'heading', markdown: '#'.repeat(level) + ' ' + text, from: nodeFrom, to: nodeTo });
    } else if (node.type.name === 'paragraph') {
      const text = extractText(node);
      entries.push({ type: 'paragraph', markdown: text, from: nodeFrom, to: nodeTo });
    } else if (node.type.name === 'blockquote') {
      const text = extractText(node);
      entries.push({ type: 'other', markdown: '> ' + text, from: nodeFrom, to: nodeTo });
    } else if (node.type.name === 'horizontalRule') {
      entries.push({ type: 'other', markdown: '---', from: nodeFrom, to: nodeTo });
    } else {
      const text = extractText(node);
      if (text) {
        entries.push({ type: 'other', markdown: text, from: nodeFrom, to: nodeTo });
      }
    }
  });

  // Second pass: build markdown lines with proper spacing.
  // - Blank line before headings (unless first entry)
  // - Blank line before first list item in a group (unless preceded by heading)
  // - No blank lines between consecutive list items
  // - Blank line after paragraphs
  let currentLine = 1;
  let prevType: string | null = null;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;

    // Add blank line before headings (except at start)
    if (entry.type === 'heading' && prevType !== null) {
      markdownLines.push('');
      currentLine++;
    }

    // Add blank line before first list item if previous wasn't a list item
    if (entry.type === 'list-item' && prevType !== 'list-item') {
      markdownLines.push('');
      currentLine++;
    }

    // Add the content line and map it
    markdownLines.push(entry.markdown);
    if (entry.markdown.trim()) {
      lineToPos.set(currentLine, { from: entry.from, to: entry.to });
    }
    currentLine++;

    // Add blank line after headings
    if (entry.type === 'heading') {
      markdownLines.push('');
      currentLine++;
    }

    // Add blank line after paragraphs/other (unless next is also paragraph or list)
    if (entry.type === 'paragraph' || entry.type === 'other') {
      const next = entries[i + 1];
      if (next && next.type !== 'list-item') {
        markdownLines.push('');
        currentLine++;
      }
    }

    // Add blank line after last list item in a group
    if (entry.type === 'list-item') {
      const next = entries[i + 1];
      if (!next || next.type !== 'list-item') {
        markdownLines.push('');
        currentLine++;
      }
    }

    prevType = entry.type;
  }

  // Remove trailing empty lines
  while (markdownLines.length > 0 && markdownLines[markdownLines.length - 1] === '') {
    markdownLines.pop();
  }

  return {
    lineToPos,
    markdown: markdownLines.join('\n').trim(),
  };
}

function extractText(node: ProseMirrorNode): string {
  let text = '';
  node.forEach((child) => {
    if (child.isText) {
      text += child.text ?? '';
    } else {
      text += extractText(child);
    }
  });
  return text;
}
