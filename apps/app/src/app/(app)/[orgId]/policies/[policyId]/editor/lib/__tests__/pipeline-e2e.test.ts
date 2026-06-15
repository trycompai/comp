import { describe, expect, it } from 'vitest';
import { EditorState } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { buildPositionMap } from '../build-position-map';
import { computeSuggestionRanges } from '../compute-suggestion-ranges';
import { buildReplacementNodes, extendDeleteRangesToSections } from '../apply-suggestion';
import { sanitizeMarkdown } from '../policy-markdown';
import { schema } from '../test-helpers/editor-schema';

/**
 * Faithfully reproduces the real client flow for "accept all suggestions":
 *   proposed (sanitized) -> buildPositionMap -> computeSuggestionRanges
 *   -> buildReplacementNodes -> apply (reverse doc order, one transaction).
 *
 * This is the deterministic part of the AI edit pipeline (everything except the
 * model call + React state), so it catches end-to-end logic regressions without
 * a deploy.
 */
function acceptAll(startDoc: ProseMirrorNode, rawProposed: string) {
  const proposed = sanitizeMarkdown(rawProposed);
  const positionMap = buildPositionMap(startDoc);
  const ranges = extendDeleteRangesToSections(
    startDoc,
    computeSuggestionRanges(positionMap, proposed),
  );

  const state = EditorState.create({ doc: startDoc });
  const tr = state.tr;
  // Reverse doc order so earlier edits don't shift later positions (matches the
  // real acceptAll which resolves positions against the original doc).
  for (const range of [...ranges].sort((a, b) => b.from - a.from)) {
    if (range.type === 'delete') {
      tr.delete(range.from, range.to);
    } else if (range.type === 'insert') {
      const nodes = buildReplacementNodes(state, range.proposedText, range.to);
      if (nodes.length) tr.insert(range.to, nodes);
    } else {
      const nodes = buildReplacementNodes(state, range.proposedText, range.from);
      if (nodes.length) tr.replaceWith(range.from, range.to, nodes);
    }
  }
  return { ranges, doc: tr.doc };
}

// ── doc builders ──
function p(text: string) {
  return schema.node('paragraph', null, text ? [schema.text(text)] : []);
}
function h(level: number, text: string) {
  return schema.node('heading', { level }, [schema.text(text)]);
}
function li(text: string) {
  return schema.node('listItem', null, [p(text)]);
}
function ul(...items: string[]) {
  return schema.node('bulletList', null, items.map(li));
}
function ol(...items: string[]) {
  return schema.node('orderedList', null, items.map(li));
}
function doc(...blocks: ProseMirrorNode[]) {
  return schema.node('doc', null, blocks);
}

// ── inspectors ──
function listTexts(node: ProseMirrorNode, listType = 'bulletList'): string[] {
  const out: string[] = [];
  node.descendants((n) => {
    if (n.type.name === listType) {
      n.forEach((item) => out.push(item.textContent));
      return false;
    }
    return true;
  });
  return out;
}

function marksOnPhrase(node: ProseMirrorNode, phrase: string): string[] {
  let found: string[] | null = null;
  node.descendants((n) => {
    if (found) return false;
    if (n.isText && n.text === phrase) {
      found = n.marks.map((m) => m.type.name).sort();
    }
    return true;
  });
  return found ?? [];
}

function topLevelTypes(d: ProseMirrorNode): string[] {
  const out: string[] = [];
  d.forEach((n) => out.push(n.type.name));
  return out;
}

describe('E2E pipeline: single-bullet edit (CS-265)', () => {
  it('changes only the targeted bullet, keeps one list', () => {
    const start = doc(
      h(2, 'Password Requirements'),
      ul(
        'Minimum 12 characters or a passphrase; prohibit commonly breached strings.',
        'No forced periodic rotation unless compromise is suspected.',
        'Unique password per system; store passwords in an approved password manager.',
        'Do not reuse passwords across work and personal accounts.',
      ),
      p('Enforce length and reuse rules in IdP/directory policies and document settings.'),
    );
    const proposed = [
      '## Password Requirements',
      '',
      '- Minimum 12 characters or a passphrase; prohibit commonly breached strings.',
      '- No forced periodic rotation unless compromise is suspected.',
      '- Use a unique password for every system and store it in an approved password manager.',
      '- Do not reuse passwords across work and personal accounts.',
      '',
      'Enforce length and reuse rules in IdP/directory policies and document settings.',
    ].join('\n');

    const { doc: result } = acceptAll(start, proposed);
    expect(listTexts(result)).toEqual([
      'Minimum 12 characters or a passphrase; prohibit commonly breached strings.',
      'No forced periodic rotation unless compromise is suspected.',
      'Use a unique password for every system and store it in an approved password manager.',
      'Do not reuse passwords across work and personal accounts.',
    ]);
    // Single list, trailing paragraph preserved
    expect(topLevelTypes(result)).toEqual(['heading', 'bulletList', 'paragraph']);
    expect(result.textContent).toContain('Enforce length and reuse rules');
  });
});

describe('E2E pipeline: inline formatting (CS-265 fmt / SALE-65)', () => {
  it('applies bold as real marks, not literal asterisks', () => {
    const start = doc(
      h(2, 'Purpose'),
      p('Provide authentication that resists brute-force and credential-stuffing attacks.'),
    );
    const proposed = [
      '## Purpose',
      '',
      'Provide authentication that resists **brute-force** and **credential-stuffing** attacks.',
    ].join('\n');

    const { ranges, doc: result } = acceptAll(start, proposed);
    expect(ranges.length).toBeGreaterThan(0); // a suggestion must appear
    expect(marksOnPhrase(result, 'brute-force')).toEqual(['bold']);
    expect(marksOnPhrase(result, 'credential-stuffing')).toEqual(['bold']);
    expect(result.textContent).not.toContain('**'); // no literal markers
  });

  it('applies a link as a real mark', () => {
    const start = doc(p('Store passwords in an approved password manager.'));
    const proposed = 'Store passwords in an approved [password manager](https://1password.com).';
    const { doc: result } = acceptAll(start, proposed);
    expect(marksOnPhrase(result, 'password manager')).toEqual(['link']);
    expect(result.textContent).not.toContain('](');
  });

  it('preserves existing bold when an unrelated paragraph changes', () => {
    const start = doc(
      schema.node('paragraph', null, [
        schema.text('Resists '),
        schema.text('brute-force', [schema.marks.bold!.create()]),
        schema.text(' attacks.'),
      ]),
      p('Scope covers all accounts.'),
    );
    const proposed = [
      'Resists **brute-force** attacks.',
      '',
      'Scope covers all human and service accounts.',
    ].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    // bold survives, only the scope sentence changed
    expect(marksOnPhrase(result, 'brute-force')).toEqual(['bold']);
    expect(result.textContent).toContain('all human and service accounts');
  });
});

describe('E2E pipeline: list inserts', () => {
  it('adds a new bullet without splitting the list', () => {
    const start = doc(ul('Alpha', 'Bravo'));
    const proposed = ['- Alpha', '- Inserted', '- Bravo'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(topLevelTypes(result)).toEqual(['bulletList']);
    expect(listTexts(result)).toEqual(['Alpha', 'Inserted', 'Bravo']);
  });
});

describe('E2E pipeline: control-char sanitization (013)', () => {
  it('strips control chars from applied content', () => {
    const start = doc(p('Old text.'));
    const vt = String.fromCharCode(0x0b);
    const proposed = `New ${vt}clean${vt} text.`;
    const { doc: result } = acceptAll(start, proposed);
    expect(result.textContent).toBe('New clean text.');
  });
});

describe('E2E pipeline: ordered list item edit', () => {
  it('keeps the list ORDERED after editing an item', () => {
    const start = doc(ol('First step', 'Second step', 'Third step'));
    // buildPositionMap emits "- " for ordered items too, so the AI echoes "- ".
    const proposed = ['- First step', '- Second step revised', '- Third step'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(topLevelTypes(result)).toEqual(['orderedList']);
    expect(listTexts(result, 'orderedList')).toEqual([
      'First step',
      'Second step revised',
      'Third step',
    ]);
  });

  it('inserts a new step into an ordered list, kept ordered', () => {
    const start = doc(ol('First step', 'Second step'));
    const proposed = ['- First step', '- Inserted step', '- Second step'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(topLevelTypes(result)).toEqual(['orderedList']);
    expect(listTexts(result, 'orderedList')).toEqual([
      'First step',
      'Inserted step',
      'Second step',
    ]);
  });
});

describe('E2E pipeline: delete a single bullet', () => {
  it('removes only the targeted bullet', () => {
    const start = doc(ul('Keep one', 'Remove me', 'Keep two'));
    const proposed = ['- Keep one', '- Keep two'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(topLevelTypes(result)).toEqual(['bulletList']);
    expect(listTexts(result)).toEqual(['Keep one', 'Keep two']);
  });
});

describe('E2E pipeline: plain paragraph modify', () => {
  it('replaces paragraph text in place', () => {
    const start = doc(h(2, 'Purpose'), p('Old purpose statement.'));
    const proposed = ['## Purpose', '', 'New, clearer purpose statement.'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(topLevelTypes(result)).toEqual(['heading', 'paragraph']);
    expect(result.textContent).toContain('New, clearer purpose statement.');
    expect(result.textContent).not.toContain('Old purpose');
  });
});

describe('E2E pipeline: multi-change in one proposal', () => {
  it('applies a bold edit AND an unrelated paragraph edit together', () => {
    const start = doc(
      h(2, 'Purpose'),
      p('Provide authentication that resists brute-force attacks.'),
      h(2, 'Scope'),
      p('Applies to all accounts.'),
    );
    const proposed = [
      '## Purpose',
      '',
      'Provide authentication that resists **brute-force** attacks.',
      '',
      '## Scope',
      '',
      'Applies to all human and service accounts.',
    ].join('\n');
    const { ranges, doc: result } = acceptAll(start, proposed);
    expect(ranges.length).toBeGreaterThanOrEqual(2);
    expect(marksOnPhrase(result, 'brute-force')).toEqual(['bold']);
    expect(result.textContent).toContain('all human and service accounts');
    expect(topLevelTypes(result)).toEqual(['heading', 'paragraph', 'heading', 'paragraph']);
  });
});

describe('E2E pipeline: realistic policy with two lists', () => {
  it('edits one bullet in the MFA list, leaving Password Requirements intact', () => {
    const start = doc(
      h(2, 'Password Requirements'),
      ul('Minimum 12 characters.', 'No forced rotation.', 'Unique per system.'),
      h(2, 'Multi-Factor Authentication (MFA)'),
      ul('Enforce MFA for admins.', 'Prefer authenticator apps; SMS only as fallback.', 'Apply step-up MFA for sensitive actions.'),
    );
    const proposed = [
      '## Password Requirements',
      '',
      '- Minimum 12 characters.',
      '- No forced rotation.',
      '- Unique per system.',
      '',
      '## Multi-Factor Authentication (MFA)',
      '',
      '- Enforce MFA for admins.',
      '- Prefer hardware tokens or authenticator apps; SMS only as a last resort.',
      '- Apply step-up MFA for sensitive actions.',
    ].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(topLevelTypes(result)).toEqual(['heading', 'bulletList', 'heading', 'bulletList']);

    const lists: string[][] = [];
    result.forEach((n) => {
      if (n.type.name === 'bulletList') {
        const items: string[] = [];
        n.forEach((it) => items.push(it.textContent));
        lists.push(items);
      }
    });
    expect(lists[0]).toEqual(['Minimum 12 characters.', 'No forced rotation.', 'Unique per system.']);
    expect(lists[1]).toEqual([
      'Enforce MFA for admins.',
      'Prefer hardware tokens or authenticator apps; SMS only as a last resort.',
      'Apply step-up MFA for sensitive actions.',
    ]);
  });
});

describe('E2E pipeline: append a new section', () => {
  it('adds a new heading + paragraph at the end', () => {
    const start = doc(h(2, 'Purpose'), p('Purpose text.'));
    const proposed = [
      '## Purpose',
      '',
      'Purpose text.',
      '',
      '## Enforcement',
      '',
      'Violations may result in disciplinary action.',
    ].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(result.textContent).toContain('Purpose text.');
    expect(result.textContent).toContain('Enforcement');
    expect(result.textContent).toContain('Violations may result in disciplinary action.');
  });
});

describe('E2E pipeline: bold inside a list item', () => {
  it('adds bold to one bullet, keeps the list intact', () => {
    const start = doc(ul('Use MFA everywhere.', 'Rotate keys quarterly.'));
    const proposed = ['- Use **MFA** everywhere.', '- Rotate keys quarterly.'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(topLevelTypes(result)).toEqual(['bulletList']);
    expect(listTexts(result)).toEqual(['Use MFA everywhere.', 'Rotate keys quarterly.']);
    expect(marksOnPhrase(result, 'MFA')).toEqual(['bold']);
    expect(result.textContent).not.toContain('**');
  });
});

describe('E2E pipeline: heading text change', () => {
  it('changes heading text without duplicating the heading', () => {
    const start = doc(h(2, 'Password Requirements'), p('Body.'));
    const proposed = ['## Password & Credential Requirements', '', 'Body.'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(topLevelTypes(result)).toEqual(['heading', 'paragraph']);
    expect(result.child(0).textContent).toBe('Password & Credential Requirements');
  });
});

describe('E2E pipeline: combined bold+italic', () => {
  it('applies ***text*** as both marks', () => {
    const start = doc(p('This is important text.'));
    const proposed = 'This is ***important*** text.';
    const { doc: result } = acceptAll(start, proposed);
    expect(marksOnPhrase(result, 'important')).toEqual(['bold', 'italic']);
  });
});

describe('E2E pipeline: section delete', () => {
  it('removes a whole section (heading + body + list) and keeps the rest', () => {
    const start = doc(
      h(2, 'Purpose'),
      p('Purpose body.'),
      h(2, 'Deprecated Section'),
      p('Outdated guidance.'),
      ul('Old item one.', 'Old item two.'),
      h(2, 'Enforcement'),
      p('Enforcement body.'),
    );
    const proposed = [
      '## Purpose',
      '',
      'Purpose body.',
      '',
      '## Enforcement',
      '',
      'Enforcement body.',
    ].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    const text = result.textContent;
    expect(text).toContain('Purpose body.');
    expect(text).toContain('Enforcement body.');
    expect(text).not.toContain('Deprecated Section');
    expect(text).not.toContain('Outdated guidance.');
    expect(text).not.toContain('Old item one.');
    // Surviving headings intact
    const headings: string[] = [];
    result.forEach((n) => {
      if (n.type.name === 'heading') headings.push(n.textContent);
    });
    expect(headings).toEqual(['Purpose', 'Enforcement']);
  });
});

describe('E2E pipeline: no-op proposal', () => {
  it('produces zero suggestions when content is unchanged', () => {
    const start = doc(h(2, 'Purpose'), p('Stays the same.'), ul('One.', 'Two.'));
    const proposed = ['## Purpose', '', 'Stays the same.', '', '- One.', '- Two.'].join('\n');
    const { ranges, doc: result } = acceptAll(start, proposed);
    expect(ranges.length).toBe(0);
    expect(result.textContent).toBe(start.textContent);
  });
});

describe('E2E pipeline: tolerant of stray whitespace from the model', () => {
  it('normalizes extra spaces in a modified paragraph', () => {
    const start = doc(p('Keep this tidy.'));
    const proposed = 'Keep   this    much   tidier.';
    const { doc: result } = acceptAll(start, proposed);
    expect(result.textContent).toBe('Keep this much tidier.');
  });

  it('strips leading indentation the model adds to a paragraph', () => {
    const start = doc(h(2, 'Purpose'), p('Old body.'));
    const proposed = ['## Purpose', '', '    Indented   body   text.'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    // No leading spaces, internal runs collapsed to single spaces.
    expect(result.child(1).textContent).toBe('Indented body text.');
  });

  it('normalizes indentation/extra spaces inside list items', () => {
    const start = doc(ul('Item one.', 'Item two.'));
    const proposed = ['-   Item one.', '-    Item   two   revised.'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(listTexts(result)).toEqual(['Item one.', 'Item two revised.']);
  });
});

describe('E2E pipeline: heading level change', () => {
  // KNOWN LIMITATION: normalizeContent strips block markers (#, -, >), so a
  // change to ONLY a heading's level (or a block-type change like heading<->para
  // or bullet<->para) with identical text is treated as "no change" and yields
  // no suggestion. Text edits to headings work; pure structural changes do not.
  // Loosening this is a deliberate behavioral choice (more sensitivity to the
  // model reformatting block markers) — left out of scope pending a decision.
  it.skip('changes ## to ### (whole-node replace) — known limitation', () => {
    const start = doc(h(2, 'Sub Section'), p('Body.'));
    const proposed = ['### Sub Section', '', 'Body.'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(result.child(0).attrs.level).toBe(3);
  });

  it('applies a heading TEXT change (whole-node replace)', () => {
    const start = doc(h(2, 'Old Heading'), p('Body.'));
    const proposed = ['## New Heading', '', 'Body.'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(result.child(0).type.name).toBe('heading');
    expect(result.child(0).attrs.level).toBe(2);
    expect(result.child(0).textContent).toBe('New Heading');
  });
});

describe('E2E pipeline: delete first / last section', () => {
  it('deletes the first section cleanly', () => {
    const start = doc(h(2, 'First'), p('First body.'), h(2, 'Second'), p('Second body.'));
    const proposed = ['## Second', '', 'Second body.'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    const headings: string[] = [];
    result.forEach((n) => {
      if (n.type.name === 'heading') headings.push(n.textContent);
    });
    expect(headings).toEqual(['Second']);
    expect(result.textContent).not.toContain('First');
  });

  it('deletes the last section cleanly', () => {
    const start = doc(h(2, 'First'), p('First body.'), h(2, 'Second'), p('Second body.'));
    const proposed = ['## First', '', 'First body.'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    const headings: string[] = [];
    result.forEach((n) => {
      if (n.type.name === 'heading') headings.push(n.textContent);
    });
    expect(headings).toEqual(['First']);
    expect(result.textContent).not.toContain('Second');
  });
});

describe('E2E pipeline: two separate lists', () => {
  it('edits a bullet in the second list, leaving the first untouched', () => {
    const start = doc(
      ul('A1', 'A2'),
      p('Divider paragraph.'),
      ul('B1', 'B2'),
    );
    const proposed = [
      '- A1',
      '- A2',
      '',
      'Divider paragraph.',
      '',
      '- B1',
      '- B2 revised',
    ].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    const lists: string[][] = [];
    result.forEach((n) => {
      if (n.type.name === 'bulletList') {
        const items: string[] = [];
        n.forEach((it) => items.push(it.textContent));
        lists.push(items);
      }
    });
    expect(lists[0]).toEqual(['A1', 'A2']);
    expect(lists[1]).toEqual(['B1', 'B2 revised']);
    expect(result.textContent).toContain('Divider paragraph.');
  });
});

describe('E2E pipeline: blockquote edit', () => {
  it('edits a blockquote in place', () => {
    const start = doc(
      schema.node('blockquote', null, [p('Quoted guidance.')]),
      p('After.'),
    );
    const proposed = ['> Updated quoted guidance.', '', 'After.'].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    expect(result.textContent).toContain('Updated quoted guidance.');
    expect(result.textContent).toContain('After.');
  });
});

describe('E2E pipeline: generate full policy from a draft stub', () => {
  it('replaces a draft stub with a full multi-section policy', () => {
    const start = doc(p('This policy is a draft.'));
    const proposed = [
      '## Purpose',
      '',
      'Provide strong authentication.',
      '',
      '## Password Requirements',
      '',
      '- Minimum 12 characters.',
      '- No forced rotation.',
      '',
      '## Enforcement',
      '',
      'Violations may result in disciplinary action.',
    ].join('\n');
    const { doc: result } = acceptAll(start, proposed);
    const text = result.textContent;
    expect(text).toContain('Provide strong authentication.');
    expect(text).toContain('Minimum 12 characters.');
    expect(text).toContain('Violations may result in disciplinary action.');
    expect(text).not.toContain('This policy is a draft.');
    // A real list materialized, not flattened paragraphs
    expect(listTexts(result)).toEqual(['Minimum 12 characters.', 'No forced rotation.']);
  });
});
