import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { JSONContent } from '@tiptap/react';

/**
 * Shared markdown helpers for the policy AI editor.
 *
 * Both the diff pipeline (build-position-map -> compute-suggestion-ranges)
 * and the apply pipeline (markdown-utils -> ProseMirror) must agree on how
 * markdown maps to document text, otherwise the diff and the applied edit
 * drift apart and produce phantom ranges / misplaced edits. Keeping the
 * conversion in one place is the single source of truth for that contract.
 *
 * Inline marks supported (encode + decode, kept symmetric): bold (**), italic
 * (*), bold+italic (***), inline code (`) and links ([text](href)). Underscore
 * emphasis is intentionally NOT parsed so snake_case identifiers in policy text
 * are never mangled. Inline-marker differences are also neutralized in the diff
 * (see normalizeContent in compute-suggestion-ranges) so any residual asymmetry
 * can't surface as a phantom suggestion.
 */

/**
 * Control characters that must never reach the document. We keep TAB
 * (U+0009) and LF (U+000A); CR is normalized to LF separately. Everything
 * else in the C0/C1 control ranges is stripped -- including U+000B (vertical
 * tab, octal 013), which the model occasionally emits and which surfaces as a
 * stray "013" glyph inside policy text.
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/**
 * Strip control-character noise from AI-generated markdown before it enters
 * the editor. Preserves newlines and tabs; normalizes CR/CRLF to LF so the
 * line-based diff stays stable.
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown) return markdown;
  return markdown.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '');
}

/** Collapse runs of spaces/tabs to a single space (SALE-65 stray whitespace). */
function collapseSpaces(text: string): string {
  return text.replace(/[ \t]{2,}/g, ' ');
}

interface InlineMark {
  type: string;
  attrs?: Record<string, unknown>;
}

function addMark(marks: InlineMark[], mark: InlineMark): InlineMark[] {
  if (marks.some((m) => m.type === mark.type)) return marks;
  return [...marks, mark];
}

function makeTextNode(text: string, marks: InlineMark[]): JSONContent {
  const isCode = marks.some((m) => m.type === 'code');
  // Code spans are literal — never collapse their whitespace.
  const value = isCode ? text : collapseSpaces(text);
  return marks.length > 0
    ? { type: 'text', text: value, marks: marks.map((m) => ({ ...m })) }
    : { type: 'text', text: value };
}

/**
 * Parse a single line of inline markdown into TipTap text nodes with marks.
 * Recurses for nestable marks (bold/italic/link); code spans are terminal.
 */
export function parseInline(text: string): JSONContent[] {
  return parseInlineWithMarks(text, []);
}

function parseInlineWithMarks(text: string, marks: InlineMark[]): JSONContent[] {
  const nodes: JSONContent[] = [];
  let buffer = '';
  let i = 0;

  const flush = () => {
    if (buffer) {
      nodes.push(makeTextNode(buffer, marks));
      buffer = '';
    }
  };

  while (i < text.length) {
    const rest = text.slice(i);

    // Link: [text](href)
    const link = /^\[([^\]]*)\]\(([^)]*)\)/.exec(rest);
    if (link) {
      flush();
      nodes.push(
        ...parseInlineWithMarks(
          link[1]!,
          addMark(marks, { type: 'link', attrs: { href: link[2]! } }),
        ),
      );
      i += link[0].length;
      continue;
    }

    // Inline code: `text` (terminal — no nested marks, raw content)
    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      flush();
      nodes.push(makeTextNode(code[1]!, addMark(marks, { type: 'code' })));
      i += code[0].length;
      continue;
    }

    // Bold + italic: ***text***
    const boldItalic = /^\*\*\*([^]+?)\*\*\*/.exec(rest);
    if (boldItalic) {
      flush();
      nodes.push(
        ...parseInlineWithMarks(
          boldItalic[1]!,
          addMark(addMark(marks, { type: 'bold' }), { type: 'italic' }),
        ),
      );
      i += boldItalic[0].length;
      continue;
    }

    // Bold: **text**
    const bold = /^\*\*([^]+?)\*\*/.exec(rest);
    if (bold) {
      flush();
      nodes.push(...parseInlineWithMarks(bold[1]!, addMark(marks, { type: 'bold' })));
      i += bold[0].length;
      continue;
    }

    // Italic: *text* (single line, no nested asterisk)
    const italic = /^\*([^*\n]+?)\*/.exec(rest);
    if (italic) {
      flush();
      nodes.push(...parseInlineWithMarks(italic[1]!, addMark(marks, { type: 'italic' })));
      i += italic[0].length;
      continue;
    }

    buffer += text[i];
    i += 1;
  }

  flush();
  return nodes;
}

/**
 * Serialize a block node's inline content back to markdown, mirroring
 * parseInline so encode/decode round-trip. Recurses into block children
 * (e.g. a listItem's paragraph) and concatenates text.
 */
export function serializeInline(node: ProseMirrorNode): string {
  let out = '';
  node.forEach((child) => {
    if (child.isText) {
      out += applyMarks(child.text ?? '', child.marks);
    } else if (child.type.name === 'hardBreak') {
      out += ' ';
    } else {
      out += serializeInline(child);
    }
  });
  return out;
}

function applyMarks(
  text: string,
  marks: readonly { type: { name: string }; attrs: Record<string, unknown> }[],
): string {
  const names = new Set(marks.map((m) => m.type.name));
  const link = marks.find((m) => m.type.name === 'link');

  let out = names.has('code') ? '`' + text + '`' : collapseSpaces(text);

  if (names.has('bold') && names.has('italic')) {
    out = '***' + out + '***';
  } else if (names.has('bold')) {
    out = '**' + out + '**';
  } else if (names.has('italic')) {
    out = '*' + out + '*';
  }

  if (link && typeof link.attrs.href === 'string') {
    out = '[' + out + '](' + link.attrs.href + ')';
  }

  return out;
}
