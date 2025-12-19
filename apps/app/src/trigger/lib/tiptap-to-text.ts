export type TipTapNode = {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string }>;
};

export function tiptapToText(content: TipTapNode[]): string {
  const lines: string[] = [];

  function processNode(node: TipTapNode, depth = 0): void {
    switch (node.type) {
      case 'heading': {
        const level = (node.attrs?.level as number) || 1;
        const prefix = '#'.repeat(level) + ' ';
        const text = extractTextFromNode(node);
        lines.push(prefix + text);
        lines.push('');
        break;
      }
      case 'paragraph': {
        const text = extractTextFromNode(node);
        lines.push(text);
        lines.push('');
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        if (node.content) {
          node.content.forEach((item, index) => {
            const prefix = node.type === 'orderedList' ? `${index + 1}. ` : '- ';
            const text = extractTextFromNode(item);
            lines.push(prefix + text);
          });
          lines.push('');
        }
        break;
      }
      case 'listItem': {
        break;
      }
      default: {
        if (node.content) {
          for (const child of node.content) {
            processNode(child, depth);
          }
        }
      }
    }
  }

  function extractTextFromNode(node: TipTapNode): string {
    if (node.text) {
      return node.text;
    }
    if (node.content) {
      return node.content.map(extractTextFromNode).join('');
    }
    return '';
  }

  for (const node of content) {
    processNode(node);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
