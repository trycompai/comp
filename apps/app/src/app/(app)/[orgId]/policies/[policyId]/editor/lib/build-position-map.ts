import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { PositionMap } from './suggestion-types';

export function buildPositionMap(doc: ProseMirrorNode): PositionMap {
  const lineToPos = new Map<number, { from: number; to: number }>();
  const markdownLines: string[] = [];
  let currentLine = 1;

  let prevWasList = false;

  doc.forEach((node, offset) => {
    const nodeFrom = offset + 1; // +1 because doc node itself takes position 0
    const isList = node.type.name === 'bulletList' || node.type.name === 'orderedList';

    // Lists: map each list item to its own position range
    // so diffs can target individual items instead of the whole list.
    // TipTap renders each bullet as a separate <ul>, so skip blank lines
    // between consecutive lists to match the AI's markdown format.
    if (isList) {
      if (!prevWasList) {
        markdownLines.push('');
        currentLine++;
      }

      node.forEach((listItem, childOffset) => {
        const itemFrom = nodeFrom + 1 + childOffset; // +1 for list open tag
        const itemTo = itemFrom + listItem.nodeSize;
        const text = extractText(listItem);
        markdownLines.push('- ' + text);
        lineToPos.set(currentLine, { from: itemFrom, to: itemTo });
        currentLine++;
      });

      prevWasList = true;
      return;
    }

    // Non-list node: close any preceding list group with a blank line
    if (prevWasList) {
      markdownLines.push('');
      currentLine++;
      prevWasList = false;
    }

    const nodeTo = nodeFrom + node.nodeSize - 2; // -2 for open/close tokens of block
    const lines = nodeToMarkdownLines(node);

    for (const line of lines) {
      markdownLines.push(line);
      if (line.trim()) {
        lineToPos.set(currentLine, { from: nodeFrom, to: nodeTo });
      }
      currentLine++;
    }
  });

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

function nodeToMarkdownLines(node: ProseMirrorNode): string[] {
  switch (node.type.name) {
    case 'heading': {
      const level = (node.attrs.level as number) || 1;
      const text = extractText(node);
      return ['', '#'.repeat(level) + ' ' + text, ''];
    }
    case 'paragraph': {
      const text = extractText(node);
      return [text, ''];
    }
    case 'bulletList':
    case 'orderedList': {
      const lines: string[] = [''];
      node.forEach((listItem) => {
        const text = extractText(listItem);
        lines.push('- ' + text);
      });
      lines.push('');
      return lines;
    }
    case 'blockquote': {
      const lines: string[] = [''];
      node.forEach((child) => {
        const text = extractText(child);
        lines.push('> ' + text);
      });
      lines.push('');
      return lines;
    }
    case 'horizontalRule':
      return ['', '---', ''];
    default: {
      const text = extractText(node);
      return text ? [text, ''] : [''];
    }
  }
}
