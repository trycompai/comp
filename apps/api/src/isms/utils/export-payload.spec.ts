import { draftVersionNumber, parseExportSnapshot } from './export-payload';
import type { LoadedExportDocument } from './export-payload';

// export-payload imports the db client at module load; a bare stub is enough
// since these pure helpers never touch it.
jest.mock('@db', () => ({ db: {} }));

const buildDocument = (
  over: Partial<LoadedExportDocument> = {},
): LoadedExportDocument =>
  ({ status: 'draft', currentVersion: null, ...over }) as unknown as LoadedExportDocument;

describe('draftVersionNumber', () => {
  it('returns 1 before anything has been published', () => {
    expect(draftVersionNumber(buildDocument({ currentVersion: null }))).toBe(1);
  });

  it('returns the published version when the approved draft is clean', () => {
    expect(
      draftVersionNumber(
        buildDocument({ status: 'approved', currentVersion: { version: 3 } }),
      ),
    ).toBe(3);
  });

  it('returns the next number while the draft is being edited', () => {
    expect(
      draftVersionNumber(
        buildDocument({ status: 'draft', currentVersion: { version: 3 } }),
      ),
    ).toBe(4);
  });
});

describe('parseExportSnapshot', () => {
  it('returns null for null / undefined', () => {
    expect(parseExportSnapshot(null)).toBeNull();
    expect(parseExportSnapshot(undefined)).toBeNull();
  });

  it('returns null for an array', () => {
    expect(parseExportSnapshot([1, 2] as never)).toBeNull();
  });

  it('returns null when required keys are missing', () => {
    expect(parseExportSnapshot({ type: 'x', input: {} })).toBeNull();
    expect(parseExportSnapshot({ input: {}, metadata: {} })).toBeNull();
  });

  it('returns the snapshot when type, input and metadata are present', () => {
    const snapshot = { type: 'x', input: { rows: [] }, metadata: { version: 1 } };
    expect(parseExportSnapshot(snapshot)).toBe(snapshot);
  });
});
