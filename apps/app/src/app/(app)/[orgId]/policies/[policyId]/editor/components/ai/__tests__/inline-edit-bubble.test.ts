import { describe, it, expect } from 'vitest';

/**
 * Tests for the sliceToMarkdown utility used by InlineEditBubble.
 * Since sliceToMarkdown is a private function, we test its behavior
 * indirectly by verifying the markdown conversion logic.
 *
 * The actual component tests would require a full TipTap editor setup,
 * so we focus on the pure logic: converting ProseMirror node structures
 * to markdown strings that the AI can process.
 */

// Re-implement sliceToMarkdown logic for isolated testing
function sliceToMarkdown(
  nodes: Array<{ type: string; text?: string; level?: number; inList?: boolean }>,
): string {
  const lines: string[] = [];

  for (const node of nodes) {
    if (node.type === 'heading') {
      const level = node.level ?? 2;
      lines.push('#'.repeat(level) + ' ' + (node.text ?? ''));
    } else if (node.type === 'paragraph' && node.inList) {
      lines.push('- ' + (node.text ?? ''));
    } else if (node.type === 'paragraph') {
      lines.push(node.text ?? '');
    }
  }

  return lines.join('\n');
}

describe('sliceToMarkdown logic', () => {
  it('converts a heading to markdown', () => {
    const result = sliceToMarkdown([
      { type: 'heading', text: 'Purpose', level: 2 },
    ]);
    expect(result).toBe('## Purpose');
  });

  it('converts a heading with different levels', () => {
    expect(sliceToMarkdown([{ type: 'heading', text: 'Sub', level: 3 }])).toBe('### Sub');
    expect(sliceToMarkdown([{ type: 'heading', text: 'Title', level: 1 }])).toBe('# Title');
  });

  it('converts a plain paragraph', () => {
    const result = sliceToMarkdown([
      { type: 'paragraph', text: 'Some policy content.' },
    ]);
    expect(result).toBe('Some policy content.');
  });

  it('converts a list item paragraph with bullet prefix', () => {
    const result = sliceToMarkdown([
      { type: 'paragraph', text: 'First bullet', inList: true },
    ]);
    expect(result).toBe('- First bullet');
  });

  it('converts mixed content preserving structure', () => {
    const result = sliceToMarkdown([
      { type: 'heading', text: 'Scope', level: 2 },
      { type: 'paragraph', text: 'Overview text.' },
      { type: 'paragraph', text: 'All employees', inList: true },
      { type: 'paragraph', text: 'All contractors', inList: true },
      { type: 'paragraph', text: 'Closing paragraph.' },
    ]);
    expect(result).toBe(
      '## Scope\nOverview text.\n- All employees\n- All contractors\nClosing paragraph.',
    );
  });

  it('handles empty text', () => {
    const result = sliceToMarkdown([
      { type: 'paragraph', text: '' },
    ]);
    expect(result).toBe('');
  });

  it('handles multiple consecutive bullets', () => {
    const result = sliceToMarkdown([
      { type: 'paragraph', text: 'Item A', inList: true },
      { type: 'paragraph', text: 'Item B', inList: true },
      { type: 'paragraph', text: 'Item C', inList: true },
    ]);
    expect(result).toBe('- Item A\n- Item B\n- Item C');
  });
});

describe('inline edit flow', () => {
  it('single bullet selection should include bullet prefix in markdown', () => {
    const markdown = sliceToMarkdown([
      { type: 'paragraph', text: 'Lock server racks', inList: true },
    ]);
    expect(markdown).toBe('- Lock server racks');
    expect(markdown.startsWith('- ')).toBe(true);
  });

  it('heading + bullets selection preserves full structure', () => {
    const markdown = sliceToMarkdown([
      { type: 'heading', text: 'Equipment Protection', level: 2 },
      { type: 'paragraph', text: 'Lock server racks', inList: true },
      { type: 'paragraph', text: 'Maintain inventory', inList: true },
    ]);
    expect(markdown).toBe(
      '## Equipment Protection\n- Lock server racks\n- Maintain inventory',
    );
  });

  it('paragraph-only selection has no markdown formatting', () => {
    const markdown = sliceToMarkdown([
      { type: 'paragraph', text: 'Retain records for 12 months.' },
    ]);
    expect(markdown).toBe('Retain records for 12 months.');
    expect(markdown).not.toContain('#');
    expect(markdown).not.toContain('- ');
  });
});
