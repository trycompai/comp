import { describe, it, expect } from 'vitest';
import { processContentArray, buildFlags, buildVariables, processTemplate } from './process-policy-template';

const vars = { COMPANY: 'Acme Inc', EMPLOYEES: '50', DATA: 'PII' };

function textNode(text: string) {
  return { type: 'text', text };
}

function paragraph(...children: Record<string, unknown>[]) {
  return { type: 'paragraph', content: children };
}

describe('processContentArray', () => {
  describe('placeholder replacement', () => {
    it('replaces {{COMPANY}} in text nodes', () => {
      const nodes = [paragraph(textNode('Welcome to {{COMPANY}}'))];
      const result = processContentArray(nodes, vars, {});
      expect((result[0] as any).content[0].text).toBe('Welcome to Acme Inc');
    });

    it('replaces multiple placeholders', () => {
      const nodes = [paragraph(textNode('{{COMPANY}} has {{EMPLOYEES}} employees handling {{DATA}}'))];
      const result = processContentArray(nodes, vars, {});
      expect((result[0] as any).content[0].text).toBe('Acme Inc has 50 employees handling PII');
    });

    it('replaces unknown placeholders with N/A', () => {
      const nodes = [paragraph(textNode('Contact {{UNKNOWN}}'))];
      const result = processContentArray(nodes, vars, {});
      expect((result[0] as any).content[0].text).toBe('Contact N/A');
    });
  });

  describe('inline conditionals (same text node)', () => {
    it('keeps content when flag is true', () => {
      const nodes = [paragraph(textNode('Before {{#if soc2}}SOC 2 content{{/if}} after'))];
      const result = processContentArray(nodes, vars, { soc2: true });
      expect((result[0] as any).content[0].text).toBe('Before SOC 2 content after');
    });

    it('removes content when flag is false', () => {
      const nodes = [paragraph(textNode('Before {{#if hipaa}}HIPAA content{{/if}} after'))];
      const result = processContentArray(nodes, vars, { hipaa: false });
      expect((result[0] as any).content[0].text).toBe('Before  after');
    });

    it('handles multiple inline conditionals in same text', () => {
      const nodes = [paragraph(textNode('{{#if soc2}}SOC2{{/if}} and {{#if hipaa}}HIPAA{{/if}}'))];
      const result = processContentArray(nodes, vars, { soc2: true, hipaa: false });
      expect((result[0] as any).content[0].text).toBe('SOC2 and ');
    });
  });

  describe('multi-node conditionals (marker-only nodes)', () => {
    it('keeps block when flag is true', () => {
      const nodes = [
        paragraph(textNode('{{#if soc2}}')),
        paragraph(textNode('SOC 2 specific content')),
        paragraph(textNode('{{/if}}')),
        paragraph(textNode('Always visible')),
      ];
      const result = processContentArray(nodes, vars, { soc2: true });
      expect(result).toHaveLength(2);
      expect((result[0] as any).content[0].text).toBe('SOC 2 specific content');
      expect((result[1] as any).content[0].text).toBe('Always visible');
    });

    it('removes block when flag is false', () => {
      const nodes = [
        paragraph(textNode('{{#if hipaa}}')),
        paragraph(textNode('HIPAA specific content')),
        paragraph(textNode('More HIPAA content')),
        paragraph(textNode('{{/if}}')),
        paragraph(textNode('Always visible')),
      ];
      const result = processContentArray(nodes, vars, { hipaa: false });
      expect(result).toHaveLength(1);
      expect((result[0] as any).content[0].text).toBe('Always visible');
    });

    it('removes block for unknown flags (defaults to false)', () => {
      const nodes = [
        paragraph(textNode('{{#if unknownFramework}}')),
        paragraph(textNode('Should be removed')),
        paragraph(textNode('{{/if}}')),
      ];
      const result = processContentArray(nodes, vars, {});
      expect(result).toHaveLength(0);
    });
  });

  describe('mixed content nodes (marker + text on same node)', () => {
    it('strips {{#if}} marker but keeps remaining text when true', () => {
      const nodes = [
        paragraph(textNode('{{#if soc2}} SOC 2 intro text')),
        paragraph(textNode('More content')),
        paragraph(textNode('{{/if}}')),
      ];
      const result = processContentArray(nodes, vars, { soc2: true });
      expect(result).toHaveLength(2);
      expect((result[0] as any).content[0].text).toBe(' SOC 2 intro text');
      expect((result[1] as any).content[0].text).toBe('More content');
    });

    it('strips {{/if}} marker but keeps remaining text', () => {
      const nodes = [
        paragraph(textNode('{{#if soc2}}')),
        paragraph(textNode('Content here')),
        paragraph(textNode('End of section {{/if}}')),
      ];
      const result = processContentArray(nodes, vars, { soc2: true });
      expect(result).toHaveLength(2);
      expect((result[0] as any).content[0].text).toBe('Content here');
      expect((result[1] as any).content[0].text).toBe('End of section ');
    });

    it('removes mixed content node when flag is false', () => {
      const nodes = [
        paragraph(textNode('{{#if hipaa}} HIPAA intro')),
        paragraph(textNode('HIPAA body')),
        paragraph(textNode('{{/if}}')),
      ];
      const result = processContentArray(nodes, vars, { hipaa: false });
      expect(result).toHaveLength(0);
    });
  });

  describe('nested conditionals', () => {
    it('outer true, inner true: keeps both', () => {
      const nodes = [
        paragraph(textNode('{{#if soc2}}')),
        paragraph(textNode('SOC 2 content')),
        paragraph(textNode('{{#if hipaa}}')),
        paragraph(textNode('SOC 2 + HIPAA content')),
        paragraph(textNode('{{/if}}')),
        paragraph(textNode('{{/if}}')),
      ];
      const result = processContentArray(nodes, vars, { soc2: true, hipaa: true });
      expect(result).toHaveLength(2);
      expect((result[0] as any).content[0].text).toBe('SOC 2 content');
      expect((result[1] as any).content[0].text).toBe('SOC 2 + HIPAA content');
    });

    it('outer true, inner false: keeps outer, removes inner', () => {
      const nodes = [
        paragraph(textNode('{{#if soc2}}')),
        paragraph(textNode('SOC 2 only')),
        paragraph(textNode('{{#if hipaa}}')),
        paragraph(textNode('Should be removed')),
        paragraph(textNode('{{/if}}')),
        paragraph(textNode('Still SOC 2')),
        paragraph(textNode('{{/if}}')),
      ];
      const result = processContentArray(nodes, vars, { soc2: true, hipaa: false });
      expect(result).toHaveLength(2);
      expect((result[0] as any).content[0].text).toBe('SOC 2 only');
      expect((result[1] as any).content[0].text).toBe('Still SOC 2');
    });

    it('outer false: removes everything including true inner', () => {
      const nodes = [
        paragraph(textNode('{{#if hipaa}}')),
        paragraph(textNode('HIPAA content')),
        paragraph(textNode('{{#if soc2}}')),
        paragraph(textNode('LEAKED if buggy')),
        paragraph(textNode('{{/if}}')),
        paragraph(textNode('{{/if}}')),
        paragraph(textNode('After block')),
      ];
      const result = processContentArray(nodes, vars, { hipaa: false, soc2: true });
      expect(result).toHaveLength(1);
      expect((result[0] as any).content[0].text).toBe('After block');
    });

    it('deeply nested: outer false hides all inner levels', () => {
      const nodes = [
        paragraph(textNode('{{#if hipaa}}')),
        paragraph(textNode('{{#if soc2}}')),
        paragraph(textNode('{{#if gdpr}}')),
        paragraph(textNode('Deep content')),
        paragraph(textNode('{{/if}}')),
        paragraph(textNode('{{/if}}')),
        paragraph(textNode('{{/if}}')),
      ];
      const result = processContentArray(nodes, vars, { hipaa: false, soc2: true, gdpr: true });
      expect(result).toHaveLength(0);
    });
  });

  describe('placeholder + conditional combined', () => {
    it('replaces placeholders inside kept conditional blocks', () => {
      const nodes = [
        paragraph(textNode('{{#if soc2}}')),
        paragraph(textNode('{{COMPANY}} complies with SOC 2')),
        paragraph(textNode('{{/if}}')),
      ];
      const result = processContentArray(nodes, vars, { soc2: true });
      expect(result).toHaveLength(1);
      expect((result[0] as any).content[0].text).toBe('Acme Inc complies with SOC 2');
    });

    it('does not process placeholders in removed blocks', () => {
      const nodes = [
        paragraph(textNode('{{#if hipaa}}')),
        paragraph(textNode('{{COMPANY}} handles PHI')),
        paragraph(textNode('{{/if}}')),
      ];
      const result = processContentArray(nodes, vars, { hipaa: false });
      expect(result).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('empty content array returns empty', () => {
      expect(processContentArray([], vars, {})).toEqual([]);
    });

    it('node with no text or content passes through', () => {
      const nodes = [{ type: 'hardBreak' }];
      const result = processContentArray(nodes, vars, {});
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'hardBreak' });
    });

    it('removes empty text nodes after placeholder replacement', () => {
      const nodes = [paragraph(textNode('{{#if hipaa}}{{/if}}'))];
      const result = processContentArray(nodes, vars, { hipaa: false });
      // Inline conditional removes content, leaving empty string → null → paragraph has no content
      expect(result).toHaveLength(0);
    });

    it('preserves node attributes and marks', () => {
      const nodes = [{
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: [{
          type: 'text',
          text: '{{COMPANY}} policy',
          marks: [{ type: 'bold' }],
        }],
      }];
      const result = processContentArray(nodes, vars, {});
      const node = result[0] as any;
      expect(node.attrs.textAlign).toBe('center');
      expect(node.content[0].text).toBe('Acme Inc policy');
      expect(node.content[0].marks).toEqual([{ type: 'bold' }]);
    });
  });
});

describe('buildVariables', () => {
  it('maps COMPANY from companyName', () => {
    const vars = buildVariables({ companyName: 'TestCo', contextHub: '' });
    expect(vars.COMPANY).toBe('TestCo');
  });

  it('extracts answers from contextHub Q&A format', () => {
    const contextHub = 'What industry is your company in?\nSaaS\nHow many employees do you have?\n50';
    const vars = buildVariables({ companyName: 'X', contextHub });
    expect(vars.INDUSTRY).toBe('SaaS');
    expect(vars.EMPLOYEES).toBe('50');
  });

  it('handles missing questions gracefully', () => {
    const vars = buildVariables({ companyName: 'X', contextHub: 'Random text' });
    expect(vars.INDUSTRY).toBeUndefined();
  });
});

describe('buildFlags', () => {
  it('detects SOC 2 framework', () => {
    const flags = buildFlags([{ name: 'SOC 2' }]);
    expect(flags.soc2).toBe(true);
    expect(flags.hipaa).toBe(false);
  });

  it('detects multiple frameworks', () => {
    const flags = buildFlags([{ name: 'SOC 2' }, { name: 'HIPAA' }, { name: 'GDPR' }]);
    expect(flags.soc2).toBe(true);
    expect(flags.hipaa).toBe(true);
    expect(flags.gdpr).toBe(true);
    expect(flags.pipeda).toBe(false);
  });

  it('detects PIPEDA', () => {
    const flags = buildFlags([{ name: 'PIPEDA' }]);
    expect(flags.pipeda).toBe(true);
  });
});

describe('processTemplate', () => {
  it('handles doc-wrapped content', () => {
    const content = {
      type: 'doc',
      content: [paragraph(textNode('{{COMPANY}} policy'))],
    };
    const result = processTemplate({
      content,
      companyName: 'TestCo',
      contextHub: '',
      frameworks: [],
    });
    expect(result).toHaveLength(1);
    expect((result[0] as any).content[0].text).toBe('TestCo policy');
  });

  it('handles array content', () => {
    const content = [paragraph(textNode('Hello {{COMPANY}}'))];
    const result = processTemplate({
      content,
      companyName: 'TestCo',
      contextHub: '',
      frameworks: [],
    });
    expect((result[0] as any).content[0].text).toBe('Hello TestCo');
  });

  it('returns empty for invalid content', () => {
    expect(processTemplate({ content: null, companyName: '', contextHub: '', frameworks: [] })).toEqual([]);
    expect(processTemplate({ content: 'string', companyName: '', contextHub: '', frameworks: [] })).toEqual([]);
    expect(processTemplate({ content: 42, companyName: '', contextHub: '', frameworks: [] })).toEqual([]);
  });
});
