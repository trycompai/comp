import {
  columnIndexToName,
  columnNameToIndex,
} from '../sheet-columns';
import type { QuestionQueueItem, SheetMapping, TabQuestionQueue } from '../types';

export interface SheetAnswer {
  fieldId: string;
  answer: string;
}

export interface SheetApiTarget extends SheetAnswer {
  gid: string;
  row: number;
  col: number;
}

interface TargetPlan {
  answerColumn: number;
  endRow: number | null;
  question: string;
  questionColumn: string;
  startRow: number;
  target: SheetApiTarget;
}

export function parseSheetTargets(answers: SheetAnswer[]): SheetApiTarget[] {
  return answers.flatMap((answer) => {
    const match = answer.fieldId.match(/^sheet:([^:]+):(\d+):(\d+)$/);
    if (!match) return [];
    return [{
      ...answer,
      gid: match[1],
      row: Number(match[2]),
      col: Number(match[3]),
    }];
  });
}

export async function resolveSheetTargets(params: {
  queue: TabQuestionQueue;
  readColumn(request: {
    column: string;
    endRow: number | null;
    startRow: number;
  }): Promise<string[]>;
  targets: SheetApiTarget[];
}): Promise<SheetApiTarget[]> {
  const plans = params.targets.map((target) => buildTargetPlan({
    queue: params.queue,
    target,
  }));
  const values = new Map<string, string[]>();

  for (const plan of plans) {
    const key = columnRangeKey(plan);
    if (!values.has(key)) {
      values.set(key, await params.readColumn({
        column: plan.questionColumn,
        endRow: plan.endRow,
        startRow: plan.startRow,
      }));
    }
  }

  return plans.map((plan) =>
    resolveTarget({ plan, values: values.get(columnRangeKey(plan)) ?? [] }),
  );
}

function buildTargetPlan(params: {
  queue: TabQuestionQueue;
  target: SheetApiTarget;
}): TargetPlan {
  const item = findQueueItem(params.queue, params.target.fieldId);
  const tag = parseSheetTag(item.tag);
  const mapping = getMatchingMapping({
    gid: params.target.gid,
    mapping: params.queue.sheetMapping,
  });
  const questionColumn = mapping?.questionColumn ?? tag?.questionColumn;
  if (!questionColumn) throw new Error(`Cannot verify sheet row for "${item.question}".`);

  return {
    answerColumn: getAnswerColumn({ mapping, tag, target: params.target }),
    endRow: mapping?.endRow ?? null,
    question: item.question,
    questionColumn,
    startRow: mapping?.startRow ?? Math.max(1, params.target.row - 25),
    target: params.target,
  };
}

function resolveTarget(params: {
  plan: TargetPlan;
  values: string[];
}): SheetApiTarget {
  const expected = normalizeQuestion(params.plan.question);
  const currentIndex = params.plan.target.row - params.plan.startRow;
  if (normalizeQuestion(params.values[currentIndex] ?? '') === expected) {
    return retarget({ plan: params.plan, row: params.plan.target.row });
  }

  const matches = params.values.flatMap((value, index) =>
    normalizeQuestion(value) === expected ? [params.plan.startRow + index] : [],
  );
  if (matches.length === 1) return retarget({ plan: params.plan, row: matches[0] });
  if (matches.length > 1) {
    throw new Error(`Question appears multiple times in the sheet: "${params.plan.question}".`);
  }
  throw new Error(`Could not verify the target row for "${params.plan.question}".`);
}

function retarget(params: {
  plan: TargetPlan;
  row: number;
}): SheetApiTarget {
  return {
    ...params.plan.target,
    col: params.plan.answerColumn,
    row: params.row,
  };
}

function findQueueItem(queue: TabQuestionQueue, fieldId: string): QuestionQueueItem {
  const item = queue.items.find((entry) => entry.fieldId === fieldId || entry.id === fieldId);
  if (!item) throw new Error('Could not find the selected sheet question in the queue.');
  return item;
}

function getMatchingMapping(params: {
  gid: string;
  mapping: SheetMapping | null;
}): SheetMapping | null {
  if (!params.mapping || params.mapping.gid !== params.gid) return null;
  return params.mapping;
}

function getAnswerColumn(params: {
  mapping: SheetMapping | null;
  tag: ReturnType<typeof parseSheetTag>;
  target: SheetApiTarget;
}): number {
  const mapped = params.mapping
    ? columnNameToIndex(params.mapping.answerColumn)
    : null;
  const tagged = params.tag
    ? columnNameToIndex(params.tag.answerColumn)
    : null;
  return (mapped ?? tagged ?? params.target.col - 1) + 1;
}

function parseSheetTag(tag: string): {
  answerColumn: string;
  questionColumn: string;
} | null {
  const match = tag.match(/^sheets:([A-Z]+)\d+->([A-Z]+)\d+$/);
  if (!match) return null;
  const questionColumn = columnIndexToName(columnNameToIndex(match[1] ?? '') ?? -1);
  const answerColumn = columnIndexToName(columnNameToIndex(match[2] ?? '') ?? -1);
  if (!questionColumn || !answerColumn) return null;
  return { answerColumn, questionColumn };
}

function columnRangeKey(plan: TargetPlan): string {
  return `${plan.questionColumn}:${plan.startRow}:${plan.endRow ?? ''}`;
}

function normalizeQuestion(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}
