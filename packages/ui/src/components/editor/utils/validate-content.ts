import type { JSONContent } from '@tiptap/react';

/**
 * Validates and fixes common TipTap JSON schema issues
 * Especially useful for AI-generated content that may have structural problems
 */
export function validateAndFixTipTapContent(content: any): JSONContent {
  if (!content) {
    return createEmptyDocument();
  }

  // If it's already a proper doc, validate its content
  if (content.type === 'doc' && content.content) {
    return {
      type: 'doc',
      content: fixContentArray(content.content),
    };
  }

  // If it's an array, wrap it in a doc
  if (Array.isArray(content)) {
    return {
      type: 'doc',
      content: fixContentArray(content),
    };
  }

  // If it's a single node, wrap it in a doc
  if (content.type && content.type !== 'doc') {
    const fixedNode = fixNode(content);
    return {
      type: 'doc',
      content: fixedNode ? [fixedNode] : [createEmptyParagraph()],
    };
  }

  // Fallback to empty document
  return createEmptyDocument();
}

/**
 * Fixes an array of content nodes
 */
function fixContentArray(contentArray: any[]): JSONContent[] {
  if (!Array.isArray(contentArray)) {
    return [createEmptyParagraph()];
  }

  const fixedContent = contentArray
    .map(fixNode)
    .filter((node): node is JSONContent => node !== null) as JSONContent[];

  // Ensure we have at least one paragraph
  if (fixedContent.length === 0) {
    return [createEmptyParagraph()];
  }

  return fixedContent;
}

function ensureNonEmptyText(value: unknown): string {
  const text = typeof value === 'string' ? value : '';
  // Normalize NBSP and narrow no-break space for emptiness checks
  const normalized = text.replace(/[\u00A0\u202F]/g, '');
  if (normalized.trim().length > 0) return text;
  // Return zero-width space to ensure non-empty text node without visual change
  return '\u200B';
}

/**
 * Fixes a single node and its content
 */
function fixNode(node: any): JSONContent | null {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const { type, content, marks, attrs, ...rest } = node;

  // Skip invalid nodes
  if (!type || typeof type !== 'string') {
    return null;
  }

  // Handle different node types
  switch (type) {
    case 'paragraph':
      return fixParagraph(node);
    case 'bulletList':
    case 'orderedList':
      return fixList(node);
    case 'listItem':
      return fixListItem(node);
    case 'table':
      return fixTable(node);
    case 'tableRow':
      return fixTableRow(node);
    case 'tableCell':
      return fixTableCell(node);
    case 'text':
      return fixTextNode(node);
    case 'heading':
      return fixHeading(node);
    case 'blockquote':
      return fixBlockquote(node);
    case 'codeBlock':
      return fixCodeBlock(node);
    case 'hardBreak':
      return { type: 'hardBreak' };
    default:
      // For other valid nodes, just fix their content if they have any
      return {
        type,
        ...(content && Array.isArray(content) && { content: fixContentArray(content) }),
        ...(marks && Array.isArray(marks) && { marks: fixMarks(marks) }),
        ...(attrs && typeof attrs === 'object' && { attrs }),
        ...rest,
      };
  }
}

/**
 * Fixes paragraph nodes
 */
function fixParagraph(node: any): JSONContent {
  const { content, attrs, ...rest } = node;

  if (!content || !Array.isArray(content)) {
    return createEmptyParagraph();
  }

  const fixedContent = content
    .map((item: any) => {
      // Fix text nodes that are missing the type property
      if (item.text && !item.type) {
        return {
          type: 'text',
          text: ensureNonEmptyText(item.text),
          ...(item.marks && { marks: fixMarks(item.marks) }),
        };
      }
      return fixNode(item);
    })
    .filter((n): n is JSONContent => Boolean(n));

  // If no valid content, keep an empty paragraph (no empty text nodes)

  return {
    type: 'paragraph',
    content: fixedContent,
    ...(attrs && typeof attrs === 'object' && { attrs }),
    ...rest,
  };
}

/**
 * Fixes list nodes (bulletList, orderedList)
 */
function fixList(node: any): JSONContent {
  const { type, content, attrs, ...rest } = node;

  if (!content || !Array.isArray(content)) {
    return {
      type,
      content: [createEmptyListItem()],
      ...(attrs && typeof attrs === 'object' && { attrs }),
      ...rest,
    };
  }

  const fixedContent = content.map(fixNode).filter(Boolean) as JSONContent[];

  if (fixedContent.length === 0) {
    fixedContent.push(createEmptyListItem());
  }

  return {
    type,
    content: fixedContent,
    ...(attrs && typeof attrs === 'object' && { attrs }),
    ...rest,
  };
}

/**
 * Fixes list item nodes
 */
function fixListItem(node: any): JSONContent {
  const { content, attrs, ...rest } = node;

  if (!content || !Array.isArray(content)) {
    return {
      type: 'listItem',
      content: [createEmptyParagraph()],
      ...(attrs && typeof attrs === 'object' && { attrs }),
      ...rest,
    };
  }

  const fixedContent = fixContentArray(content);

  return {
    type: 'listItem',
    content: fixedContent,
    ...(attrs && typeof attrs === 'object' && { attrs }),
    ...rest,
  };
}

/**
 * Fixes text nodes
 */
function fixTextNode(node: any): JSONContent {
  const { text, marks, ...rest } = node;

  const value = ensureNonEmptyText(text);
  return {
    type: 'text',
    text: value,
    ...(marks && Array.isArray(marks) && { marks: fixMarks(marks) }),
    ...rest,
  };
}

/**
 * Fixes heading nodes
 */
function fixHeading(node: any): JSONContent {
  const { content, attrs, level, ...rest } = node;

  // Ensure level is valid (1-6)
  const validLevel = typeof level === 'number' && level >= 1 && level <= 6 ? level : 1;

  return {
    type: 'heading',
    attrs: { level: validLevel, ...(attrs && typeof attrs === 'object' ? attrs : {}) },
    content: content && Array.isArray(content) ? fixContentArray(content) : [],
    ...rest,
  };
}

/**
 * Fixes blockquote nodes
 */
function fixBlockquote(node: any): JSONContent {
  const { content, attrs, ...rest } = node;

  return {
    type: 'blockquote',
    content:
      content && Array.isArray(content) ? fixContentArray(content) : [createEmptyParagraph()],
    ...(attrs && typeof attrs === 'object' && { attrs }),
    ...rest,
  };
}

/**
 * Fixes code block nodes
 */
function fixCodeBlock(node: any): JSONContent {
  const { content, attrs, ...rest } = node;

  return {
    type: 'codeBlock',
    content: content && Array.isArray(content) ? fixContentArray(content) : [],
    ...(attrs && typeof attrs === 'object' && { attrs }),
    ...rest,
  };
}

/**
 * Fixes table structures
 */
function fixTable(node: any): JSONContent {
  const { content, attrs, ...rest } = node;
  let rows: JSONContent[] = [];
  if (Array.isArray(content)) {
    rows = content
      .map((child: any) => (child?.type === 'tableRow' ? fixTableRow(child) : null))
      .filter(Boolean) as JSONContent[];
  }
  if (rows.length === 0) {
    rows = [createEmptyTableRow()];
  }
  return { type: 'table', content: rows, ...(attrs && { attrs }), ...rest };
}

function fixTableRow(node: any): JSONContent {
  const { content, attrs, ...rest } = node;
  let cells: JSONContent[] = [];
  if (Array.isArray(content)) {
    cells = content
      .map((child: any) => (child?.type === 'tableCell' ? fixTableCell(child) : null))
      .filter(Boolean) as JSONContent[];
  }
  if (cells.length === 0) {
    cells = [createEmptyTableCell()];
  }
  return { type: 'tableRow', content: cells, ...(attrs && { attrs }), ...rest };
}

function fixTableCell(node: any): JSONContent {
  const { content, attrs, ...rest } = node;
  let blocks: JSONContent[] = [];
  if (Array.isArray(content)) {
    blocks = fixContentArray(content);
  }
  if (blocks.length === 0) {
    blocks = [createEmptyParagraph()];
  }
  return { type: 'tableCell', content: blocks, ...(attrs && { attrs }), ...rest };
}

/**
 * Fixes marks array
 */
function fixMarks(marks: any[]): any[] {
  if (!Array.isArray(marks)) {
    return [];
  }

  return marks
    .filter((mark) => mark && typeof mark === 'object' && mark.type)
    .map((mark) => ({
      type: mark.type,
      ...(mark.attrs && typeof mark.attrs === 'object' && { attrs: mark.attrs }),
    }));
}

/**
 * Creates an empty document
 */
function createEmptyDocument(): JSONContent {
  return {
    type: 'doc',
    content: [createEmptyParagraph()],
  };
}

/**
 * Creates an empty paragraph
 */
function createEmptyParagraph(): JSONContent {
  return {
    type: 'paragraph',
    content: [],
  };
}

/**
 * Creates an empty list item
 */
function createEmptyListItem(): JSONContent {
  return {
    type: 'listItem',
    content: [createEmptyParagraph()],
  };
}

function createEmptyTableCell(): JSONContent {
  return {
    type: 'tableCell',
    content: [createEmptyParagraph()],
  };
}

function createEmptyTableRow(): JSONContent {
  return {
    type: 'tableRow',
    content: [createEmptyTableCell()],
  };
}

/**
 * Validates if content is a valid TipTap document structure
 */
export function isValidTipTapContent(content: any): boolean {
  try {
    if (!content || typeof content !== 'object') {
      return false;
    }

    if (content.type !== 'doc' || !Array.isArray(content.content)) {
      return false;
    }

    // Basic validation - could be extended
    return content.content.every(
      (node: any) => node && typeof node === 'object' && typeof node.type === 'string',
    );
  } catch {
    return false;
  }
}

/**
 * Debug function to log content structure issues
 */
export function debugTipTapContent(content: any): void {
  console.group('🔍 TipTap Content Debug');

  if (!content) {
    console.warn('❌ Content is null/undefined');
    console.groupEnd();
    return;
  }

  if (typeof content !== 'object') {
    console.warn('❌ Content is not an object:', typeof content);
    console.groupEnd();
    return;
  }

  if (content.type !== 'doc') {
    console.warn('❌ Root type is not "doc":', content.type);
  } else {
    console.log('✅ Root type is "doc"');
  }

  if (!Array.isArray(content.content)) {
    console.warn('❌ Content.content is not an array:', typeof content.content);
  } else {
    console.log('✅ Content.content is an array with', content.content.length, 'items');

    content.content.forEach((node: any, index: number) => {
      console.group(`Node ${index}:`);
      console.log('Type:', node?.type);
      console.log('Has content:', Array.isArray(node?.content));
      if (node?.type === 'paragraph' && Array.isArray(node.content)) {
        node.content.forEach((textNode: any, textIndex: number) => {
          console.log(`  Text ${textIndex}:`, {
            type: textNode?.type,
            hasText: 'text' in textNode,
            marks: textNode?.marks?.length || 0,
          });
        });
      }
      console.groupEnd();
    });
  }

  console.groupEnd();
}
