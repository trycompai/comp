import { describe, expect, it } from 'vitest';
import {
  parseSheetTargets,
  resolveSheetTargets,
} from './google-sheets-target-resolution';
import type { QuestionQueueItem, TabQuestionQueue } from '../types';

describe('Google Sheets target resolution', () => {
  it('retargets a stale row by matching the selected question text', async () => {
    const queue = queueWithItems([
      item({
        id: 'sheet:7:2:3',
        question: '2.1.1 Has the organization implemented a security program?',
        tag: 'sheets:B2->C2',
      }),
      item({
        id: 'sheet:7:3:3',
        question: '2.1.2 Has the organization determined the scope of the program?',
        tag: 'sheets:B3->C3',
      }),
    ]);
    const targets = parseSheetTargets([{
      fieldId: 'sheet:7:3:3',
      answer: 'Scoped and documented.',
    }]);

    const resolved = await resolveSheetTargets({
      queue,
      targets,
      readColumn: async () => [
        '2.1.1 Has the organization implemented a security program?',
        '2.1.2 Has the organization determined the scope of the program?',
      ],
    });

    expect(resolved).toEqual([{
      fieldId: 'sheet:7:3:3',
      answer: 'Scoped and documented.',
      gid: '7',
      row: 4,
      col: 3,
    }]);
  });

  it('throws when a question cannot be uniquely verified', async () => {
    const queue = queueWithItems([
      item({
        id: 'sheet:7:3:3',
        question: 'Do you support SSO?',
        tag: 'sheets:B3->C3',
      }),
    ]);
    const targets = parseSheetTargets([{ fieldId: 'sheet:7:3:3', answer: 'Yes.' }]);

    await expect(resolveSheetTargets({
      queue,
      targets,
      readColumn: async () => ['Different question', 'Do you support SSO?', 'Do you support SSO?'],
    })).rejects.toThrow('multiple times');
  });
});

function queueWithItems(items: QuestionQueueItem[]): TabQuestionQueue {
  return {
    tabId: 1,
    url: 'https://docs.google.com/spreadsheets/d/sheet_123/edit#gid=7',
    host: 'docs.google.com',
    surface: 'sheets',
    sheetMapping: {
      spreadsheetId: 'sheet_123',
      gid: '7',
      questionColumn: 'B',
      answerColumn: 'C',
      startRow: 3,
      endRow: null,
      source: 'manual',
      confirmed: true,
      updatedAt: 1,
    },
    organizationId: 'org_1',
    selectedItemId: null,
    staleDraftCount: 0,
    items,
    updatedAt: 1,
  };
}

function item(params: {
  fieldId?: string;
  id: string;
  question: string;
  tag: string;
}): QuestionQueueItem {
  return {
    id: params.id,
    fieldId: params.fieldId ?? params.id,
    question: params.question,
    value: '',
    isEmpty: true,
    tag: params.tag,
    status: 'generated',
    answer: 'Answer',
    confidence: 'high',
    sources: [],
    edited: false,
    createdAt: 1,
    updatedAt: 1,
  };
}
