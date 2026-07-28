import { extensionConfig } from '../../lib/config';
import type { PanelState } from '../../lib/types';

type Surface = PanelState['queue']['surface'];

export function renderSurfaceNote(surface: Surface): string {
  if (surface === 'docs') {
    return '<div class="notice">Google Docs detected. Inline buttons are disabled; use copy or side-panel review first.</div>';
  }
  if (surface === 'sheets') return '';
  if (surface === 'forms') {
    return '<div class="notice">Google Forms detected. Text and paragraph answer fields can be generated and inserted.</div>';
  }
  return '';
}

export function footerButtonLabel(params: {
  approved: number;
  answerCount: number;
  surface: Surface;
}): string {
  if (params.surface === 'docs') {
    return params.answerCount > 0
      ? `Copy ${params.answerCount} answers`
      : 'Generate answers to copy';
  }
  if (params.surface === 'sheets') {
    if (extensionConfig.googleSheetsApiEnabled) {
      return params.approved > 0
        ? `Insert into sheet (${params.approved})`
        : 'Approve answers to insert';
    }
    return params.approved > 0
      ? `Prepare paste (${params.approved})`
      : 'Approve answers to paste';
  }
  if (params.approved > 0) return `Insert ${params.approved} approved`;
  return 'Approve answers to insert';
}

export function footerAction(surface: Surface): string {
  return surface === 'docs' ? 'copy-answers' : 'insert-approved';
}

export function footerDisabled(params: {
  approved: number;
  answerCount: number;
  surface: Surface;
}): string {
  // Docs has no insertion path, so the footer copies instead of inserting and
  // gates on generated answers rather than approvals.
  if (params.surface === 'docs') return params.answerCount === 0 ? 'disabled' : '';
  return params.approved === 0 ? 'disabled' : '';
}
