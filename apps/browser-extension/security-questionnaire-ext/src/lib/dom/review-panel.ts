import type { BatchProgressItem, GeneratedAnswer } from '../types';
import type { WritableField } from './field-detection';
import { insertAnswerIntoField } from './field-actions';

export class ReviewPanel {
  private root: HTMLElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.dataset.compSqRoot = 'true';
    document.body.appendChild(this.root);
  }

  showLoading(question: string): void {
    this.root.innerHTML = this.wrapPanel({
      title: 'Generating answer',
      body: `
        <div>
          <span class="comp-sq-label">Question</span>
          <div class="comp-sq-text">${escapeHtml(question)}</div>
        </div>
        <div class="comp-sq-status">Searching Comp AI knowledge base...</div>
      `,
      footer: this.closeButtonHtml(),
    });
    this.bindClose();
  }

  showSingle(params: {
    field: WritableField;
    question: string;
    result: GeneratedAnswer;
  }): void {
    const answer = params.result.answer;
    this.root.innerHTML = this.wrapPanel({
      title: 'Review answer',
      body: `
        <div>
          <span class="comp-sq-label">Question</span>
          <div class="comp-sq-text">${escapeHtml(params.question)}</div>
        </div>
        <div>
          <span class="comp-sq-label">Generated answer</span>
          <div class="comp-sq-answer comp-sq-text">${escapeHtml(
            answer ?? params.result.error ?? 'No answer generated.',
          )}</div>
        </div>
      `,
      footer: `
        ${this.closeButtonHtml('Cancel')}
        <button class="comp-sq-primary" data-comp-sq-insert="true" ${
          answer ? '' : 'disabled'
        }>Insert</button>
      `,
    });
    this.bindClose();
    const insertButton = this.root.querySelector('[data-comp-sq-insert="true"]');
    insertButton?.addEventListener('click', () => {
      if (!answer) return;
      if (params.field instanceof HTMLElement && !isOverwriteAllowed(params.field)) {
        return;
      }
      insertAnswerIntoField({ field: params.field, answer });
      this.close();
    });
  }

  showBatch(items: BatchProgressItem[]): void {
    this.root.innerHTML = this.wrapPanel({
      title: 'Visible questions',
      body: `
        <div class="comp-sq-list">
          ${items.map((item) => this.renderBatchItem(item)).join('')}
        </div>
      `,
      footer: this.closeButtonHtml('Done'),
    });
    this.bindClose();
  }

  close(): void {
    this.root.remove();
  }

  private wrapPanel(params: {
    title: string;
    body: string;
    footer: string;
  }): string {
    return `
      <div class="comp-sq-panel">
        <div class="comp-sq-panel-header">
          <div class="comp-sq-title">${escapeHtml(params.title)}</div>
          <button class="comp-sq-secondary" data-comp-sq-close="true">Close</button>
        </div>
        <div class="comp-sq-body">${params.body}</div>
        <div class="comp-sq-panel-footer">${params.footer}</div>
      </div>
    `;
  }

  private renderBatchItem(item: BatchProgressItem): string {
    const answer = item.answer
      ? `<div class="comp-sq-answer comp-sq-text">${escapeHtml(item.answer)}</div>`
      : '';
    return `
      <div class="comp-sq-item" data-comp-sq-field="${escapeHtml(item.fieldId)}">
        <div class="comp-sq-text">${escapeHtml(item.question)}</div>
        ${answer}
        <div class="comp-sq-status">${escapeHtml(item.error ?? item.status)}</div>
      </div>
    `;
  }

  private closeButtonHtml(label = 'Close'): string {
    return `<button class="comp-sq-secondary" data-comp-sq-close="true">${label}</button>`;
  }

  private bindClose(): void {
    this.root.querySelectorAll('[data-comp-sq-close="true"]').forEach((button) => {
      button.addEventListener('click', () => this.close());
    });
  }
}

function isOverwriteAllowed(field: HTMLElement): boolean {
  const currentValue =
    field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
      ? field.value
      : field.textContent ?? '';
  if (currentValue.trim().length === 0) return true;
  return window.confirm('This field already has text. Replace it with the generated answer?');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
