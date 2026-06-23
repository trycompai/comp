import { compMarkSvg } from '../brand';

export type InlineButtonState = 'idle' | 'busy' | 'inserted';

const clickHandlers = new WeakMap<HTMLElement, () => void>();

export function createInlineButtonHost(params: {
  fieldId: string;
  buttonAttribute: string;
  onClick(): void;
}): HTMLElement {
  const host = document.createElement('span');
  host.dataset.compSqRoot = 'true';
  host.setAttribute(params.buttonAttribute, params.fieldId);
  host.attachShadow({ mode: 'open' });
  clickHandlers.set(host, params.onClick);
  setInlineButtonState(host, 'idle');
  return host;
}

export function setInlineButtonState(
  host: HTMLElement | null,
  state: InlineButtonState,
): void {
  if (!host?.shadowRoot) return;
  const label =
    state === 'busy'
      ? 'Drafting answer from Comp AI'
      : state === 'inserted'
        ? 'Answer inserted by Comp AI'
        : 'Generate answer with Comp AI';
  host.shadowRoot.innerHTML = `
    <style>
      :host {
        color: #111827;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      button {
        align-items: center;
        background: #ffffff;
        border: 1px solid #b7efcf;
        border-radius: 6px;
        box-shadow: 0 1px 2px rgb(16 24 40 / 8%);
        color: #111827;
        cursor: pointer;
        display: inline-flex;
        height: 26px;
        line-height: 1;
        margin: 4px;
        padding: 0;
        place-content: center;
        vertical-align: middle;
        width: 26px;
      }
      button:hover:not(:disabled) {
        background: #f7fff9;
        border-color: #00dc73;
      }
      button.busy {
        background: #f8fafc;
        border-color: #cbd5e1;
      }
      button.busy .mark {
        animation: compSqPulse 900ms ease-in-out infinite;
      }
      button.inserted {
        background: #e8fff1;
        border-color: #00dc73;
      }
      button:disabled { cursor: default; opacity: 0.75; }
      .mark {
        display: inline-flex;
        flex: none;
        height: 14px;
        width: 14px;
      }
      .mark svg {
        display: block;
        fill: #111827;
        height: 100%;
        width: 100%;
      }
      .sr {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
        width: 1px;
      }
      @keyframes compSqPulse {
        0%, 100% { opacity: 0.45; transform: scale(0.92); }
        50% { opacity: 1; transform: scale(1); }
      }
    </style>
    <button class="${state}" type="button" aria-label="${label}" title="${label}" ${state === 'busy' ? 'disabled' : ''}>
      <span class="mark" aria-hidden="true">${compMarkSvg()}</span>
      <span class="sr">${label}</span>
    </button>
  `;
  const handleClick = clickHandlers.get(host);
  if (handleClick) {
    host.shadowRoot.querySelector('button')?.addEventListener('click', handleClick);
  }
}
