import { extractCommentPlainText } from './extract-comment-plain-text';

function tiptapDoc(content: unknown[]): string {
  return JSON.stringify({ type: 'doc', content });
}

describe('extractCommentPlainText', () => {
  it('returns plain text as-is when content is not JSON', () => {
    expect(extractCommentPlainText('Just a plain comment')).toBe(
      'Just a plain comment',
    );
  });

  it('extracts an empty string from an empty Tiptap document', () => {
    expect(extractCommentPlainText(tiptapDoc([]))).toBe('');
  });

  it('returns plain text as-is when it happens to be valid JSON but not a Tiptap doc (bypass regression)', () => {
    const longPlainText = 'x'.repeat(3000);
    const jsonLookingText = `{"foo": "${longPlainText}"}`;
    expect(extractCommentPlainText(jsonLookingText)).toBe(jsonLookingText);

    const jsonArrayLookingText = `["${longPlainText}"]`;
    expect(extractCommentPlainText(jsonArrayLookingText)).toBe(
      jsonArrayLookingText,
    );
  });

  it('extracts text from a simple paragraph', () => {
    const content = tiptapDoc([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello world' }],
      },
    ]);
    expect(extractCommentPlainText(content)).toBe('Hello world');
  });

  it('ignores formatting marks — bold text counts the same as plain text', () => {
    const content = tiptapDoc([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'This word is ' },
          { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
          { type: 'text', text: '.' },
        ],
      },
    ]);
    expect(extractCommentPlainText(content)).toBe('This word is bold.');
  });

  it('counts one character per hard break and per paragraph boundary', () => {
    const content = tiptapDoc([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Line one' },
          { type: 'hardBreak' },
          { type: 'text', text: 'Line two' },
        ],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Second paragraph' }],
      },
    ]);
    expect(extractCommentPlainText(content)).toBe(
      'Line one\nLine two\nSecond paragraph',
    );
  });

  it('renders a mention as @label', () => {
    const content = tiptapDoc([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hey ' },
          { type: 'mention', attrs: { id: 'usr_1', label: 'Jane Doe' } },
        ],
      },
    ]);
    expect(extractCommentPlainText(content)).toBe('Hey @Jane Doe');
  });

  it('extracts text from a bullet list', () => {
    const content = tiptapDoc([
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Item one' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Item two' }],
              },
            ],
          },
        ],
      },
    ]);
    expect(extractCommentPlainText(content)).toBe('Item one\nItem two');
  });

  it('does not double-count the line break for a blockquoted paragraph', () => {
    const content = tiptapDoc([
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Quoted line' }],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Next line' }],
      },
    ]);
    // If blockquote also appended its own newline on top of the paragraph's,
    // this would be 'Quoted line\n\nNext line' instead.
    expect(extractCommentPlainText(content)).toBe('Quoted line\nNext line');
  });

  it('matches the reported bug: a ~1,200-char formatted comment exceeds 2000 raw chars but stays under the visible limit', () => {
    // Alternating bold/plain 5-char words, like a comment with scattered
    // emphasis — each bold run's marks array is pure JSON overhead.
    const words = Array.from({ length: 240 }, (_, i) => ({
      type: 'text',
      text: 'word ',
      ...(i % 2 === 0 ? { marks: [{ type: 'bold' }] } : {}),
    }));
    const content = tiptapDoc([{ type: 'paragraph', content: words }]);

    // 240 * 5 = 1200 visible characters, well under the 2000 limit.
    expect(extractCommentPlainText(content).length).toBe(1200);
    // But the raw JSON (what the old @MaxLength(2000) validated) blows past
    // it purely from marks/node overhead — this is the bug.
    expect(content.length).toBeGreaterThan(2000);
  });
});
