import { describe, expect, it } from 'vitest';
import {
  getQueueHost,
  getQueueScope,
  getQueueSurface,
  shouldResetQueueForUrl,
} from './queue-scope';
import type { TabQuestionQueue } from '../types';

describe('queue scope', () => {
  it('scopes Google Sheets queues by spreadsheet id and gid', () => {
    expect(getQueueScope(
      'https://docs.google.com/spreadsheets/d/sheet_1/edit#gid=10&range=B2',
    )).toBe('sheets:sheet_1:10');
    expect(getQueueScope(
      'https://docs.google.com/spreadsheets/d/sheet_1/edit#gid=20',
    )).toBe('sheets:sheet_1:20');
  });

  it('resets when the active tab moved to another spreadsheet', () => {
    expect(shouldResetQueueForUrl({
      queue: queue('https://docs.google.com/spreadsheets/d/sheet_1/edit#gid=10'),
      url: 'https://docs.google.com/spreadsheets/d/sheet_2/edit#gid=10',
    })).toBe(true);
  });

  it('does not reset for range-only sheet hash changes', () => {
    expect(shouldResetQueueForUrl({
      queue: queue('https://docs.google.com/spreadsheets/d/sheet_1/edit#gid=10&range=B2'),
      url: 'https://docs.google.com/spreadsheets/d/sheet_1/edit#gid=10&range=C3',
    })).toBe(false);
  });

  it('reads host and surface from the current url', () => {
    expect(getQueueHost('https://docs.google.com/forms/d/form_1/edit')).toBe(
      'docs.google.com',
    );
    expect(getQueueSurface('https://docs.google.com/forms/d/form_1/edit')).toBe('forms');
  });
});

function queue(url: string): TabQuestionQueue {
  return {
    tabId: 1,
    url,
    host: 'docs.google.com',
    surface: 'sheets',
    sheetMapping: null,
    organizationId: 'org_1',
    selectedItemId: null,
    staleDraftCount: 0,
    items: [],
    updatedAt: 1,
  };
}
