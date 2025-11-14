import type { Policy } from '@db';

/**
 * Extracts plain text from a TipTap JSON policy content
 * Handles various TipTap node types: paragraphs, headings, lists, etc.
 * @param policy - The policy object with TipTap JSON content
 * @returns Plain text representation of the policy
 */
export function extractTextFromPolicy(policy: Policy): string {
  if (!policy.content || !Array.isArray(policy.content)) {
    return '';
  }

  const textParts: string[] = [];

  // Add policy name and description if available
  if (policy.name) {
    textParts.push(`Policy: ${policy.name}`);
  }
  if (policy.description) {
    textParts.push(`Description: ${policy.description}`);
  }

  // Process TipTap JSON content
  const processNode = (node: any): string => {
    if (!node || typeof node !== 'object') {
      return '';
    }

    const parts: string[] = [];

    // Handle text nodes
    if (node.type === 'text' && node.text) {
      return node.text;
    }

    // Handle headings
    if (node.type === 'heading' && node.content) {
      const headingText = node.content
        .map((child: any) => processNode(child))
        .join('');
      parts.push(headingText);
    }

    // Handle paragraphs
    if (node.type === 'paragraph' && node.content) {
      const paraText = node.content.map((child: any) => processNode(child)).join('');
      if (paraText.trim()) {
        parts.push(paraText);
      }
    }

    // Handle bullet lists
    if (node.type === 'bulletList' && node.content) {
      node.content.forEach((listItem: any) => {
        if (listItem.type === 'listItem' && listItem.content) {
          listItem.content.forEach((itemContent: any) => {
            const itemText = processNode(itemContent);
            if (itemText.trim()) {
              parts.push(`• ${itemText}`);
            }
          });
        }
      });
    }

    // Handle ordered lists
    if (node.type === 'orderedList' && node.content) {
      let index = 1;
      node.content.forEach((listItem: any) => {
        if (listItem.type === 'listItem' && listItem.content) {
          listItem.content.forEach((itemContent: any) => {
            const itemText = processNode(itemContent);
            if (itemText.trim()) {
              parts.push(`${index}. ${itemText}`);
              index++;
            }
          });
        }
      });
    }

    // Handle other node types recursively
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any) => {
        const childText = processNode(child);
        if (childText.trim()) {
          parts.push(childText);
        }
      });
    }

    return parts.join('\n');
  };

  // Process all content nodes
  policy.content.forEach((node: any) => {
    const nodeText = processNode(node);
    if (nodeText.trim()) {
      textParts.push(nodeText);
    }
  });

  return textParts.join('\n\n');
}

