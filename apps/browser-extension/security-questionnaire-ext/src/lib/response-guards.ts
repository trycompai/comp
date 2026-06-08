import type {
  DomainConfirmationRequest,
  PanelState,
  QuestionQueueItem,
  TabQuestionQueue,
} from './types';
import type { SheetPastePayload } from './sheets-paste-plan';

export function isPanelStateResponse(
  value: unknown,
): value is { ok: true; panelState: PanelState } {
  return isRecord(value) && value.ok === true && isRecord(value.panelState);
}

export function isQueueResponse(
  value: unknown,
): value is { ok: true; queue: TabQuestionQueue } {
  return isRecord(value) && value.ok === true && isRecord(value.queue);
}

export function isItemResponse(
  value: unknown,
): value is { ok: true; item: QuestionQueueItem; queue: TabQuestionQueue } {
  return isRecord(value) && value.ok === true && isRecord(value.item);
}

export function isSheetPasteResponse(
  value: unknown,
): value is { ok: true; sheetPaste: SheetPastePayload } {
  return (
    isRecord(value) &&
    value.ok === true &&
    isRecord(value.sheetPaste) &&
    typeof value.sheetPaste.range === 'string' &&
    typeof value.sheetPaste.tsv === 'string' &&
    Array.isArray(value.sheetPaste.itemIds)
  );
}

export function isCountResponse(
  value: unknown,
): value is { ok: true; count: number; queue?: TabQuestionQueue } {
  return isRecord(value) && value.ok === true && typeof value.count === 'number';
}

export function isConfirmationResponse(
  value: unknown,
): value is { ok: false; confirmation: DomainConfirmationRequest } {
  return isRecord(value) && value.ok === false && isRecord(value.confirmation);
}

export function isOkResponse(value: unknown): value is { ok: true } {
  return isRecord(value) && value.ok === true;
}

export function getResponseError(value: unknown): string {
  if (isRecord(value) && typeof value.error === 'string') return value.error;
  return 'Unable to complete request.';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
