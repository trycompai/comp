import { describe, expect, it } from 'vitest';
import { parseInline, sanitizeMarkdown, serializeInline } from '../policy-markdown';
import { schema } from '../test-helpers/editor-schema';

// Build a paragraph PM node from inline JSON so we can round-trip through
// serializeInline against the real ProseMirror schema.
function paragraphFrom(inline: ReturnType<typeof parseInline>) {
  return schema.nodeFromJSON({ type: 'paragraph', content: inline });
}

function roundTrip(markdown: string): string {
  return serializeInline(paragraphFrom(parseInline(markdown)));
}

describe('sanitizeMarkdown', () => {
  it('strips C0/C1 control chars including the "013" vertical tab', () => {
    const vt = String.fromCharCode(0x0b); // vertical tab = octal 013
    const dc3 = String.fromCharCode(0x13);
    const del = String.fromCharCode(0x7f);
    expect(sanitizeMarkdown(`Access${vt}Control${dc3}Policy${del}`)).toBe(
      'AccessControlPolicy',
    );
  });

  it('preserves tabs and newlines', () => {
    expect(sanitizeMarkdown('line1\nline2\tindented')).toBe('line1\nline2\tindented');
  });

  it('normalizes CR and CRLF to LF', () => {
    expect(sanitizeMarkdown('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('handles empty input', () => {
    expect(sanitizeMarkdown('')).toBe('');
  });
});

describe('parseInline', () => {
  it('returns a plain text node for unformatted text', () => {
    expect(parseInline('Just plain text.')).toEqual([
      { type: 'text', text: 'Just plain text.' },
    ]);
  });

  it('parses bold, italic, code and links', () => {
    expect(parseInline('**bold**')).toEqual([
      { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
    ]);
    expect(parseInline('*italic*')).toEqual([
      { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
    ]);
    expect(parseInline('`code`')).toEqual([
      { type: 'text', text: 'code', marks: [{ type: 'code' }] },
    ]);
    expect(parseInline('[site](https://x.com)')).toEqual([
      { type: 'text', text: 'site', marks: [{ type: 'link', attrs: { href: 'https://x.com' } }] },
    ]);
  });

  it('parses a mark in the middle of a sentence', () => {
    expect(parseInline('see the **Security** section')).toEqual([
      { type: 'text', text: 'see the ' },
      { type: 'text', text: 'Security', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' section' },
    ]);
  });

  it('parses bold+italic ***text***', () => {
    expect(parseInline('***strong***')).toEqual([
      { type: 'text', text: 'strong', marks: [{ type: 'bold' }, { type: 'italic' }] },
    ]);
  });

  it('does NOT treat snake_case underscores as italic', () => {
    expect(parseInline('use the snake_case_name variable')).toEqual([
      { type: 'text', text: 'use the snake_case_name variable' },
    ]);
  });

  it('does NOT treat a lone asterisk as a mark', () => {
    expect(parseInline('5 * 3 = 15')).toEqual([{ type: 'text', text: '5 * 3 = 15' }]);
  });

  it('collapses stray whitespace runs (SALE-65)', () => {
    expect(parseInline('Retain    records   for')).toEqual([
      { type: 'text', text: 'Retain records for' },
    ]);
  });
});

describe('serializeInline', () => {
  const bold = schema.marks.bold!.create();
  const italic = schema.marks.italic!.create();
  const code = schema.marks.code!.create();
  const link = (href: string) => schema.marks.link!.create({ href });

  function para(...nodes: ReturnType<typeof schema.text>[]) {
    return schema.node('paragraph', null, nodes);
  }

  it('emits markdown markers for marks', () => {
    expect(serializeInline(para(schema.text('bold', [bold])))).toBe('**bold**');
    expect(serializeInline(para(schema.text('italic', [italic])))).toBe('*italic*');
    expect(serializeInline(para(schema.text('code', [code])))).toBe('`code`');
    expect(serializeInline(para(schema.text('site', [link('https://x.com')])))).toBe(
      '[site](https://x.com)',
    );
  });

  it('emits ***text*** for bold+italic', () => {
    expect(serializeInline(para(schema.text('s', [bold, italic])))).toBe('***s***');
  });

  it('serializes a mid-sentence mark', () => {
    expect(
      serializeInline(
        para(
          schema.text('see the '),
          schema.text('Security', [bold]),
          schema.text(' section'),
        ),
      ),
    ).toBe('see the **Security** section');
  });
});

describe('round-trip parse <-> serialize', () => {
  const cases = [
    'Just plain text.',
    'A sentence with **bold** word.',
    'A sentence with *italic* word.',
    'Use `code` inline.',
    'See [the policy](https://example.com/p) here.',
    'A **bold** and *italic* mix.',
    '***both at once***',
    'snake_case_name stays literal',
    'Plain ending after a [link](https://x.com).',
  ];

  it.each(cases)('round-trips: %s', (md) => {
    expect(roundTrip(md)).toBe(md);
  });
});
