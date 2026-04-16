import { PolicyPdfRendererService } from './policy-pdf-renderer.service';

describe('PolicyPdfRendererService', () => {
  let service: PolicyPdfRendererService;

  beforeEach(() => {
    service = new PolicyPdfRendererService();
  });

  describe('renderPoliciesPdfBuffer', () => {
    it('returns a valid PDF buffer for a simple policy', () => {
      const result = service.renderPoliciesPdfBuffer(
        [
          {
            name: 'Privacy Policy',
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'We respect your privacy.' }],
                },
              ],
            },
          },
        ],
        'Test Org',
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('handles multiple policies', () => {
      const policies = [
        {
          name: 'Policy A',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Content A' }],
              },
            ],
          },
        },
        {
          name: 'Policy B',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Content B' }],
              },
            ],
          },
        },
      ];

      const result = service.renderPoliciesPdfBuffer(policies, 'Test Org');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles empty content', () => {
      const result = service.renderPoliciesPdfBuffer(
        [{ name: 'Empty Policy', content: null }],
        'Test Org',
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it('handles policies without organization name', () => {
      const result = service.renderPoliciesPdfBuffer([
        {
          name: 'Standalone Policy',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Standalone content.' }],
              },
            ],
          },
        },
      ]);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('handles rich content with headings, bold, lists', () => {
      const result = service.renderPoliciesPdfBuffer(
        [
          {
            name: 'Rich Policy',
            content: {
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 1 },
                  content: [{ type: 'text', text: 'Section 1' }],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Bold text',
                      marks: [{ type: 'bold' }],
                    },
                  ],
                },
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Item 1' }],
                        },
                      ],
                    },
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Item 2' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
        'Test Org',
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles emoji characters without producing garbled output', () => {
      // Regression test for CS-191: flag emojis like 🇬🇧🇫🇷 were rendered as
      // garbled text "Ø<ÝìØ<Ýç +þ" because Helvetica can't render emojis
      const result = service.renderPoliciesPdfBuffer(
        [
          {
            name: 'Policy with Emojis',
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: '🇬🇧🇫🇷 English version available bellow',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: '🎉 Welcome to our policy 🌍',
                    },
                  ],
                },
              ],
            },
          },
        ],
        'Test Org',
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.subarray(0, 5).toString()).toBe('%PDF-');

      // Verify the PDF text does NOT contain garbled emoji byte sequences
      const pdfText = result.toString('latin1');
      expect(pdfText).not.toContain('Ø<Ýì');
      expect(pdfText).not.toContain('Ø<Ýç');
    });

    it('preserves accented characters alongside emojis', () => {
      const result = service.renderPoliciesPdfBuffer(
        [
          {
            name: "Politique d'Authentification",
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: "🇫🇷 Résumé des règles d'authentification café",
                    },
                  ],
                },
              ],
            },
          },
        ],
        'Test Org',
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles content with only emojis', () => {
      const result = service.renderPoliciesPdfBuffer(
        [
          {
            name: 'Emoji Only',
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: '🎉🌍😀🇬🇧' }],
                },
              ],
            },
          },
        ],
        'Test Org',
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it('handles emojis in headings and list items', () => {
      const result = service.renderPoliciesPdfBuffer(
        [
          {
            name: '📋 Policy Title',
            content: {
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 1 },
                  content: [{ type: 'text', text: '🔒 Security Section' }],
                },
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            { type: 'text', text: '✅ Requirement met' },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
        'Test Org',
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('applies custom primary color', () => {
      const result = service.renderPoliciesPdfBuffer(
        [
          {
            name: 'Branded Policy',
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Content' }],
                },
              ],
            },
          },
        ],
        'Branded Org',
        '#ff6600',
      );

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
