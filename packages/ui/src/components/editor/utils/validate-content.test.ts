import { describe, expect, it, vi } from 'vitest';
import {
  debugTipTapContent,
  isValidTipTapContent,
  validateAndFixTipTapContent,
} from './validate-content';

describe('validateAndFixTipTapContent', () => {
  // Your exact problematic schema from the original question
  const problematicSchema = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            text: '1 . Table of Contents',
            type: 'text',
            marks: [
              {
                type: 'bold',
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            text: 'Executive Summary: Comp AI is committed to maintaining the highest security standards to protect sensitive data. This policy delineates acceptable use and endpoint security measures to ensure compliance with SOC 2. All employees must adhere strictly to these guidelines for safe and responsible use of company resources.',
            // ❌ This is the problematic node - missing "type": "text"
          },
        ],
      },
    ],
  };

  describe('fixing your exact problematic schema', () => {
    it('should fix the missing type property in the last paragraph', () => {
      const fixedContent = validateAndFixTipTapContent(problematicSchema);

      // Verify the document structure is valid
      expect(fixedContent.type).toBe('doc');
      expect(fixedContent.content).toBeDefined();
      expect(Array.isArray(fixedContent.content)).toBe(true);

      // Get the last paragraph (the problematic one) - we know it exists
      const lastParagraph = (fixedContent.content as any[])[1];
      expect(lastParagraph.type).toBe('paragraph');
      expect(lastParagraph.content).toBeDefined();

      // Check that the text node now has the correct type
      const textNode = lastParagraph.content[0];
      expect(textNode.type).toBe('text');
      expect(textNode.text).toContain('Executive Summary');
    });

    it('should preserve all existing valid content', () => {
      const fixedContent = validateAndFixTipTapContent(problematicSchema);

      expect(fixedContent.type).toBe('doc');
      expect(fixedContent.content).toBeDefined();
      expect((fixedContent.content as any[]).length).toBe(2);

      // Check that bold marks are preserved in the first paragraph
      const firstParagraph = (fixedContent.content as any[])[0];
      expect(firstParagraph.type).toBe('paragraph');
      const firstTextNode = firstParagraph.content[0];
      expect(firstTextNode.marks).toBeDefined();
      expect(firstTextNode.marks[0].type).toBe('bold');
    });

    it('should result in valid TipTap content', () => {
      const fixedContent = validateAndFixTipTapContent(problematicSchema);
      expect(isValidTipTapContent(fixedContent)).toBe(true);
    });
  });

  describe('common AI generation issues', () => {
    it('should fix missing text type properties', () => {
      const contentWithMissingTypes = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                text: 'Hello world', // Missing type: "text"
              },
            ],
          },
        ],
      };

      const fixed = validateAndFixTipTapContent(contentWithMissingTypes);
      const textNode = (fixed.content as any[])[0].content[0];
      expect(textNode.type).toBe('text');
      expect(textNode.text).toBe('Hello world');
    });

    it('should handle array content instead of doc structure', () => {
      const arrayContent = [
        {
          type: 'paragraph',
          content: [
            { text: 'Missing type' }, // Missing type
          ],
        },
      ];

      const fixed = validateAndFixTipTapContent(arrayContent);
      expect(fixed.type).toBe('doc');

      const textNode = (fixed.content as any[])[0].content[0];
      expect(textNode.type).toBe('text');
      expect(textNode.text).toBe('Missing type');
    });

    it('should handle null and undefined content', () => {
      const nullResult = validateAndFixTipTapContent(null);
      expect(nullResult.type).toBe('doc');
      expect(nullResult.content).toBeDefined();

      const undefinedResult = validateAndFixTipTapContent(undefined);
      expect(undefinedResult.type).toBe('doc');
      expect(undefinedResult.content).toBeDefined();
    });

    it('should handle completely invalid input gracefully', () => {
      const invalidInputs = ['string', 123, {}, { type: 'invalid' }, { content: 'not an array' }];

      invalidInputs.forEach((input) => {
        const fixed = validateAndFixTipTapContent(input);
        expect(isValidTipTapContent(fixed)).toBe(true);
        expect(fixed.type).toBe('doc');
      });
    });
  });

  describe('isValidTipTapContent', () => {
    it('should return true for valid content', () => {
      const validContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world' }],
          },
        ],
      };

      expect(isValidTipTapContent(validContent)).toBe(true);
    });

    it('should return false for invalid content', () => {
      expect(isValidTipTapContent(null)).toBe(false);
      expect(isValidTipTapContent('string')).toBe(false);
      expect(isValidTipTapContent({})).toBe(false);
      expect(isValidTipTapContent({ type: 'notdoc' })).toBe(false);
    });
  });

  describe('debugTipTapContent', () => {
    it('should not throw errors when debugging content', () => {
      const spy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      expect(() => {
        debugTipTapContent(problematicSchema);
        debugTipTapContent(null);
        debugTipTapContent('invalid');
        debugTipTapContent({});
      }).not.toThrow();

      spy.mockRestore();
      warnSpy.mockRestore();
      logSpy.mockRestore();
      groupEndSpy.mockRestore();
    });
  });

  describe('empty text node handling', () => {
    const strip = (s: string) => s.replace(/[\u00A0\u200B\u202F]/g, '').trim();

    const hasEmptyTextNodes = (node: any): boolean => {
      if (!node || typeof node !== 'object') return false;
      if (node.type === 'text') {
        const txt = typeof node.text === 'string' ? node.text : '';
        return strip(txt).length === 0;
      }
      if (Array.isArray(node.content)) {
        return node.content.some((child: any) => hasEmptyTextNodes(child));
      }
      return false;
    };

    it('removes empty and whitespace-only (including NBSP/ZWSP) text nodes in paragraphs', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '' },
              { type: 'text', text: ' ' },
              { type: 'text', text: '\u00A0' },
              { type: 'text', text: '\u200B' },
              { type: 'text', text: 'Hello' },
              { text: 'World' },
            ],
          },
        ],
      };

      const fixed = validateAndFixTipTapContent(content);
      expect(fixed.type).toBe('doc');
      expect(hasEmptyTextNodes(fixed)).toBe(false);

      const paragraph = (fixed.content as any[])[0];
      const texts = paragraph.content.map((n: any) => n.text);
      expect(texts).toEqual(['Hello', 'World']);
    });

    it('does not introduce empty text nodes when creating empty structures', () => {
      const fixed = validateAndFixTipTapContent({});
      expect(fixed.type).toBe('doc');
      expect(hasEmptyTextNodes(fixed)).toBe(false);
    });
  });
});
