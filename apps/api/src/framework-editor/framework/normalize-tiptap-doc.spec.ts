import { normalizeTipTapDoc } from './normalize-tiptap-doc';

describe('normalizeTipTapDoc', () => {
  it('wraps a bare node array into a doc', () => {
    const nodes = [{ type: 'paragraph', content: [] }];
    expect(normalizeTipTapDoc(nodes)).toEqual({ type: 'doc', content: nodes });
  });

  it('passes through an existing doc node', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph' }] };
    expect(normalizeTipTapDoc(doc)).toEqual(doc);
  });

  it('empties a doc node with a non-array content', () => {
    expect(normalizeTipTapDoc({ type: 'doc' })).toEqual({ type: 'doc', content: [] });
  });

  it('wraps a single non-doc node', () => {
    const node = { type: 'paragraph', content: [{ type: 'text', text: 'hi' }] };
    expect(normalizeTipTapDoc(node)).toEqual({ type: 'doc', content: [node] });
  });

  it('returns an empty doc for null / undefined', () => {
    expect(normalizeTipTapDoc(null)).toEqual({ type: 'doc', content: [] });
    expect(normalizeTipTapDoc(undefined)).toEqual({ type: 'doc', content: [] });
  });

  it('returns an empty doc for a bare object (the {} footgun)', () => {
    expect(normalizeTipTapDoc({})).toEqual({ type: 'doc', content: [] });
  });

  it('returns an empty doc for primitive values', () => {
    expect(normalizeTipTapDoc('a string')).toEqual({ type: 'doc', content: [] });
    expect(normalizeTipTapDoc(42)).toEqual({ type: 'doc', content: [] });
  });
});
