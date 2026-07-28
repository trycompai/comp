import { compMarkSvg } from '../../lib/brand';
import { extensionConfig } from '../../lib/config';
import type {
  AnswerConfidence,
  Organization,
  PanelState,
  QuestionQueueItem,
  QueueStatus,
} from '../../lib/types';
import { renderSheetMappingBar } from './sheet-mapping-ui';
import {
  footerAction,
  footerButtonLabel,
  footerDisabled,
  renderSurfaceNote,
} from './surface-ui';

export function renderSidePanel(
  state: PanelState,
  message = '',
  isRefreshing = false,
): string {
  if (state.auth.status !== 'authenticated') {
    return shell(`
      <div class="empty">
        <h1>Sign in to Comp AI</h1>
        <p>Use your Comp session to generate questionnaire answers.</p>
        <button class="primary" data-action="sign-in">Sign in</button>
      </div>
    `);
  }

  const total = state.queue.items.length;
  const inserted = countByStatus(state.queue.items, 'inserted');
  const approved = countByStatus(state.queue.items, 'approved');
  const generated = countByStatus(state.queue.items, 'generated');
  const generating = countByStatus(state.queue.items, 'generating');
  const flagged = countByStatus(state.queue.items, 'flagged');
  const answerCount = state.queue.items.filter((item) => item.answer).length;
  const progress = total > 0 ? Math.round((inserted / total) * 100) : 0;

  return shell(`
    <div class="panel">
      <header class="head">
        <div class="title-row">
          <span class="mark" aria-hidden="true">${compMarkSvg()}</span>
          <h1>Questionnaire</h1>
          <button class="icon ${isRefreshing ? 'refreshing' : ''}" data-action="refresh" title="${isRefreshing ? 'Refreshing' : 'Refresh'}" ${isRefreshing ? 'disabled' : ''}>↻</button>
          <button class="icon" data-action="close" title="Close">×</button>
        </div>
        ${renderOrgSelect(state.auth.organizations, state.auth.selectedOrganizationId)}
        <div class="progress"><span style="width:${progress}%"></span></div>
        <div class="legend">
          ${legendItem('inserted', `Inserted ${inserted}`)}
          ${legendItem('approved', `Approved ${approved}`)}
          ${generating > 0 ? legendItem('generating', `Drafting ${generating}`) : ''}
          ${generated > 0 ? legendItem('generated', `Drafted ${generated}`) : ''}
          ${flagged > 0 ? legendItem('flagged', `Review ${flagged}`) : ''}
        </div>
      </header>
      <div class="toolbar">
        <button class="primary flex" data-action="generate-all" ${total === 0 || generating > 0 ? 'disabled' : ''}>
          ${generating > 0 ? `Generating (${generating})` : `Generate all (${total})`}
        </button>
        <button class="secondary" data-action="approve-all" ${generated === 0 ? 'disabled' : ''}>
          Approve all
        </button>
      </div>
      ${renderSurfaceNote(state.queue.surface)}
      ${renderSheetMappingBar({
        mapping: state.queue.sheetMapping,
        surface: state.queue.surface,
      })}
      ${message ? `<div class="notice ${message.startsWith('Scan refreshed') ? 'info' : ''}">${escapeHtml(message)}</div>` : ''}
      <main class="list">
        ${total > 0 ? state.queue.items.map((item) => renderQueueRow({
          item,
          canInsertIntoSurface:
            state.queue.surface !== 'docs',
          surface: state.queue.surface,
        })).join('') : renderEmptyQueue()}
      </main>
      <footer class="foot">
        <button class="primary block" data-action="${footerAction(state.queue.surface)}" ${footerDisabled({
          approved,
          answerCount,
          surface: state.queue.surface,
        })}>
          ${footerButtonLabel({ approved, answerCount, surface: state.queue.surface })}
        </button>
      </footer>
    </div>
  `);
}

export function renderDomainDialog(params: {
  host: string;
  organizationName: string;
}): string {
  return dialog(`
    <div class="eyebrow">Confirm workspace</div>
    <h2>Use ${escapeHtml(params.organizationName)} here?</h2>
    <p>Answers will be generated or inserted on <code>${escapeHtml(params.host)}</code>.</p>
    <div class="org-banner">${escapeHtml(params.organizationName)}</div>
    <div class="dialog-actions">
      <button class="secondary" data-dialog="cancel">Cancel</button>
      <button class="primary" data-dialog="confirm">Confirm</button>
    </div>
  `);
}

export function renderInsertDialog(params: {
  count: number;
  host: string;
  organizationName: string;
  lowConfidenceCount: number;
  operation?: 'Insert' | 'Copy';
}): string {
  const operation = params.operation ?? 'Insert';
  const destination = operation === 'Copy'
    ? 'Answers will be copied for guided paste into the detected answer cells.'
    : `Destination: <code>${escapeHtml(params.host)}</code>`;
  return dialog(`
    <div class="eyebrow">Confirm ${operation.toLowerCase()}</div>
    <h2>${operation} ${params.count} approved answer${params.count === 1 ? '' : 's'}?</h2>
    <p>${destination}</p>
    <div class="org-banner">${escapeHtml(params.organizationName)}</div>
    ${
      params.lowConfidenceCount > 0
        ? `<p>${params.lowConfidenceCount} low-confidence draft${params.lowConfidenceCount === 1 ? '' : 's'} excluded.</p>`
        : ''
    }
    <div class="dialog-actions">
      <button class="secondary" data-dialog="cancel">Cancel</button>
      <button class="primary" data-dialog="confirm">${operation} as ${escapeHtml(params.organizationName)}</button>
    </div>
  `);
}

export function renderStaleDialog(staleDraftCount: number): string {
  return dialog(`
    <div class="eyebrow">Workspace changed</div>
    <h2>${staleDraftCount} draft${staleDraftCount === 1 ? '' : 's'} cleared</h2>
    <p>Uninserted answers must be regenerated for the new workspace.</p>
    <div class="dialog-actions">
      <button class="primary" data-dialog="confirm">Done</button>
    </div>
  `);
}

function renderOrgSelect(
  organizations: Organization[],
  selectedOrganizationId: string | null,
): string {
  const options = organizations
    .map(
      (org) =>
        `<option value="${escapeHtml(org.id)}" ${
          org.id === selectedOrganizationId ? 'selected' : ''
        }>${escapeHtml(org.name)}</option>`,
    )
    .join('');
  return `
    <label class="org-select">
      <span>Active workspace</span>
      <select data-action="switch-org">${options}</select>
    </label>
  `;
}

function renderQueueRow(params: {
  item: QuestionQueueItem;
  canInsertIntoSurface: boolean;
  surface: PanelState['queue']['surface'];
}): string {
  const { item } = params;
  const canApprove = item.status === 'generated' && Boolean(item.answer);
  const canInsert =
    params.canInsertIntoSurface &&
    (item.status === 'approved' || item.status === 'generated') &&
    Boolean(item.answer);
  const sources = item.sources.length;
  return `
    <article class="row ${item.status}" data-item-id="${escapeHtml(item.id)}">
      <button class="row-main" data-action="select-item" data-item-id="${escapeHtml(item.id)}">
        <span class="sq ${item.status}"></span>
        <span>${escapeHtml(item.question)}</span>
      </button>
      ${renderAnswer(item)}
      <div class="row-foot">
        ${item.confidence ? confidence(item.confidence) : `<span class="status">${statusLabel(item.status)}</span>`}
        ${sources > 0 ? `<span class="sources">Sources · ${sources}</span>` : ''}
        <span class="spacer"></span>
        ${canApprove ? `<button class="primary xs" data-action="approve-item" data-item-id="${escapeHtml(item.id)}">Approve</button>` : ''}
        ${canInsert ? renderInsertButton({ itemId: item.id, surface: params.surface }) : ''}
      </div>
    </article>
  `;
}

function renderInsertButton(params: {
  itemId: string;
  surface: PanelState['queue']['surface'];
}): string {
  const itemId = escapeHtml(params.itemId);
  if (params.surface !== 'sheets') {
    return `<button class="secondary xs" data-action="insert-item" data-item-id="${itemId}">Insert</button>`;
  }
  const title = extensionConfig.googleSheetsApiEnabled
    ? 'Insert into mapped cell'
    : 'Prepare mapped paste';
  return [
    `<button class="secondary xs icon-action" data-action="insert-item"`,
    `data-item-id="${itemId}" title="${title}"`,
    `aria-label="${title}">`,
    '<span class="paste-mark" aria-hidden="true"></span></button>',
  ].join(' ');
}

function renderAnswer(item: QuestionQueueItem): string {
  if (item.status === 'generating') {
    return '<div class="answer pending">Drafting from knowledge base...</div>';
  }
  if (item.status === 'flagged') {
    return [
      '<div class="answer flagged">',
      '<strong>Needs review</strong>',
      `<span>${escapeHtml(item.error ?? 'No knowledge-base match.')}</span>`,
      '</div>',
    ].join('');
  }
  if (!item.answer) return '';
  return `<textarea data-answer-for="${escapeHtml(item.id)}">${escapeHtml(item.answer)}</textarea>`;
}

function renderEmptyQueue(): string {
  return `
    <div class="empty">
      <h1>No fields detected</h1>
      <p>Scan the page or click a Comp AI button next to a questionnaire field.</p>
    </div>
  `;
}

function shell(body: string): string {
  return `<div class="shell">${body}</div>`;
}

function dialog(body: string): string {
  return `<div class="modal"><div class="backdrop"></div><section class="dialog">${body}</section></div>`;
}

function legendItem(status: QueueStatus, label: string): string {
  return `<span><i class="${status}"></i>${escapeHtml(label)}</span>`;
}

function confidence(level: AnswerConfidence): string {
  return `<span class="conf ${level}">${level}</span>`;
}

function statusLabel(status: QueueStatus): string {
  if (status === 'pending') return 'Pending';
  if (status === 'generating') return 'Drafting';
  if (status === 'generated') return 'Drafted';
  if (status === 'approved') return 'Approved';
  if (status === 'inserted') return 'Inserted';
  return 'Review';
}

function countByStatus(items: QuestionQueueItem[], status: QueueStatus): number {
  return items.filter((item) => item.status === status).length;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
