import type { QuestionQueueItem } from '../types';

interface InlinePreviewActions {
  onInsert(answer: string): void;
  onDismiss(): void;
  onRegenerate(): void;
}

export class InlinePreview {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private draftAnswer = '';

  constructor(private anchor: HTMLElement) {
    this.host = document.createElement('div');
    this.host.dataset.compSqRoot = 'true';
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: 'open' });
  }

  showLoading(question: string): void {
    this.shadow.innerHTML = this.wrap(`
      <div class="head">
        <strong>Suggested answer</strong>
        <button class="icon" data-action="dismiss" aria-label="Dismiss">×</button>
      </div>
      <div class="question"><span>Q.</span>${escapeHtml(question)}</div>
      <div class="loading"><span class="spin"></span>Drafting from Comp AI knowledge base...</div>
    `);
    this.position();
    this.bindDismiss(() => this.close());
  }

  showResult(item: QuestionQueueItem, actions: InlinePreviewActions): void {
    this.draftAnswer = item.answer ?? '';
    if (item.status === 'flagged' || !item.answer) {
      this.shadow.innerHTML = this.wrap(`
        <div class="head">
          <strong>No knowledge-base match</strong>
          <button class="icon" data-action="dismiss" aria-label="Dismiss">×</button>
        </div>
        <div class="question"><span>Q.</span>${escapeHtml(item.question)}</div>
        <p class="muted">Answer manually or add a source before inserting.</p>
        <div class="foot">
          <button class="secondary" data-action="dismiss">Dismiss</button>
        </div>
      `);
      this.position();
      this.bindDismiss(actions.onDismiss);
      return;
    }

    this.shadow.innerHTML = this.wrap(`
      <div class="head">
        <strong>Suggested answer</strong>
        <span class="conf ${item.confidence ?? 'med'}">${escapeHtml(item.confidence ?? 'med')}</span>
        <button class="icon" data-action="dismiss" aria-label="Dismiss">×</button>
      </div>
      <div class="question"><span>Q.</span>${escapeHtml(item.question)}</div>
      <textarea aria-label="Generated answer">${escapeHtml(item.answer)}</textarea>
      <div class="sources">Sources · ${item.sources.length}</div>
      <div class="foot">
        <button class="secondary" data-action="regenerate">Regenerate</button>
        <button class="secondary" data-action="dismiss">Dismiss</button>
        <button class="primary" data-action="insert">Insert</button>
      </div>
    `);
    this.position();
    this.bindDismiss(actions.onDismiss);
    this.shadow.querySelector('textarea')?.addEventListener('input', (event) => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement) this.draftAnswer = target.value;
    });
    this.shadow
      .querySelector('[data-action="regenerate"]')
      ?.addEventListener('click', actions.onRegenerate);
    this.shadow.querySelector('[data-action="insert"]')?.addEventListener('click', () => {
      actions.onInsert(this.draftAnswer);
    });
  }

  close(): void {
    this.host.remove();
  }

  private wrap(body: string): string {
    return `<style>${previewStyles}</style><section class="popover">${body}</section>`;
  }

  private bindDismiss(onDismiss: () => void): void {
    this.shadow.querySelectorAll('[data-action="dismiss"]').forEach((button) => {
      button.addEventListener('click', () => {
        this.close();
        onDismiss();
      });
    });
  }

  private position(): void {
    const rect = this.anchor.getBoundingClientRect();
    const width = 360;
    const left = Math.min(
      Math.max(12, rect.right - width),
      Math.max(12, window.innerWidth - width - 12),
    );
    const top = Math.min(rect.bottom + 8, window.innerHeight - 340);
    const popover = this.shadow.querySelector('.popover');
    if (popover instanceof HTMLElement) {
      popover.style.left = `${left}px`;
      popover.style.top = `${Math.max(12, top)}px`;
    }
  }
}

const previewStyles = `
  :host {
    color: #111827;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  * {
    box-sizing: border-box;
  }
  .popover {
    background: #ffffff;
    border: 1px solid #e4e4e7;
    border-radius: 8px;
    box-shadow: 0 12px 32px -8px rgb(16 24 40 / 12%);
    box-sizing: border-box;
    display: grid;
    gap: 10px;
    max-height: min(440px, calc(100vh - 24px));
    overflow: auto;
    padding: 12px;
    position: fixed;
    width: 360px;
    z-index: 2147483647;
    color: #111827;
  }
  .head {
    align-items: center;
    display: flex;
    gap: 8px;
  }
  strong {
    color: #111827;
    flex: 1;
    font-size: 13px;
    font-weight: 700;
  }
  .icon {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e4e4e7;
    border-radius: 6px;
    color: #111827;
    cursor: pointer;
    display: inline-flex;
    font-size: 18px;
    height: 26px;
    justify-content: center;
    line-height: 1;
    width: 26px;
  }
  .icon:hover {
    background: #f9fafb;
  }
  .question {
    color: #374151;
    font-size: 12px;
    line-height: 17px;
  }
  .question span,
  .sources {
    color: #4b5563;
    font-size: 10px;
    font-weight: 700;
    margin-right: 4px;
    text-transform: uppercase;
  }
  textarea {
    background: #ffffff;
    border: 1px solid #e4e4e7;
    border-radius: 6px;
    box-sizing: border-box;
    color: #111827;
    font: inherit;
    font-size: 13px;
    line-height: 18px;
    min-height: 112px;
    padding: 9px;
    resize: vertical;
    width: 100%;
  }
  .loading,
  .muted {
    color: #374151;
    font-size: 12px;
    line-height: 17px;
  }
  .spin {
    animation: comp-spin 800ms linear infinite;
    border: 2px solid #e4e4e7;
    border-top-color: #00dc73;
    border-radius: 999px;
    display: inline-block;
    height: 12px;
    margin-right: 6px;
    vertical-align: -2px;
    width: 12px;
  }
  .conf {
    border-radius: 2px;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 5px;
    text-transform: uppercase;
  }
  .conf.high { background: #d7f9e7; color: #009e54; }
  .conf.med { background: #fdecd2; color: #c2740a; }
  .conf.low { background: #fde2e1; color: #e0413b; }
  .foot {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  button {
    color: #111827;
    font: inherit;
  }
  .primary,
  .secondary {
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
    min-height: 32px;
    padding: 6px 10px;
  }
  .primary {
    background: #111827;
    border: 1px solid #111827;
    color: #ffffff;
  }
  .primary:hover {
    background: #030712;
  }
  .secondary {
    background: #ffffff;
    border: 1px solid #d4d4d8;
    color: #374151;
  }
  .secondary:hover {
    background: #f9fafb;
  }
  @keyframes comp-spin { to { transform: rotate(360deg); } }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
