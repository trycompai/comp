/**
 * Node types whose content represents a separate visual line. A trailing
 * newline is appended after their text so line/paragraph breaks the user
 * typed count toward the visible length, matching what they see on screen.
 * Wrapper types (listItem, tableCell, ...) are deliberately excluded — their
 * children are typically paragraphs that already contribute a newline, and
 * including the wrapper too would double-count each line break.
 */
const BLOCK_NODE_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
]);

interface TiptapNode {
  type?: unknown;
  text?: unknown;
  attrs?: unknown;
  content?: unknown;
}

function mentionLabel(node: TiptapNode): string {
  const attrs = node.attrs as { label?: unknown; id?: unknown } | undefined;
  if (typeof attrs?.label === 'string' && attrs.label) return attrs.label;
  if (typeof attrs?.id === 'string' && attrs.id) return attrs.id;
  return '';
}

function nodeToText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as TiptapNode;

  if (n.type === 'text') {
    return typeof n.text === 'string' ? n.text : '';
  }

  if (n.type === 'hardBreak') {
    return '\n';
  }

  if (n.type === 'mention') {
    const label = mentionLabel(n);
    return label ? `@${label}` : '';
  }

  if (Array.isArray(n.content)) {
    const childText = n.content.map(nodeToText).join('');
    return BLOCK_NODE_TYPES.has(typeof n.type === 'string' ? n.type : '')
      ? `${childText}\n`
      : childText;
  }

  return '';
}

function isTiptapDoc(value: unknown): value is TiptapNode {
  if (!value || typeof value !== 'object') return false;
  const n = value as TiptapNode;
  return n.type === 'doc' && Array.isArray(n.content);
}

/**
 * Extracts the visible text a user typed from a comment's stored `content`.
 * Comments accept either raw Tiptap/ProseMirror JSON (from the web editor)
 * or plain text (from API/MCP callers) — formatting marks, node types, and
 * attrs are structural overhead that inflates the raw string but adds no
 * visible characters, so length checks must run against this instead of
 * `content.length`.
 *
 * Only parses `content` as Tiptap when it has the expected `{ type: 'doc',
 * content: [...] }` shape. A plain-text comment that happens to be valid
 * JSON (e.g. `{"foo": "..."}`) would otherwise be walked as a node tree,
 * match no known type, and silently extract to `''` — bypassing the length
 * check entirely instead of falling back to the raw string.
 */
export function extractCommentPlainText(content: string): string {
  if (typeof content !== 'string') return '';

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return content;
  }

  if (!isTiptapDoc(parsed)) {
    return content;
  }

  return nodeToText(parsed).replace(/\n+$/, '');
}
