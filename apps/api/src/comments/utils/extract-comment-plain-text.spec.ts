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
