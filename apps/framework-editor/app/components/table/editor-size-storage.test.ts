// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { clearEditorSize, loadEditorSize, saveEditorSize } from './editor-size-storage';

const COOKIE_NAME = 'fwk-editor-expand-editor-size';

function setRawCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/`;
}

describe('editor-size-storage', () => {
  afterEach(() => clearEditorSize());

  it('returns null when nothing is stored', () => {
    expect(loadEditorSize()).toBeNull();
  });

  it('round-trips a valid size', () => {
    saveEditorSize({ width: 900, height: 500 });
    expect(loadEditorSize()).toEqual({ width: 900, height: 500 });
  });

  it('returns null for malformed JSON', () => {
    setRawCookie('{not json');
    expect(loadEditorSize()).toBeNull();
  });

  it('does not store non-positive or non-numeric dimensions', () => {
    saveEditorSize({ width: 0, height: 100 });
    expect(loadEditorSize()).toBeNull();

    setRawCookie(JSON.stringify({ width: 'x', height: 1 }));
    expect(loadEditorSize()).toBeNull();
  });
});
