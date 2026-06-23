import type { DomainConfirmationRequest } from '../types';

export function confirmDomainInContent(
  confirmation: DomainConfirmationRequest,
): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.dataset.compSqRoot = 'true';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${dialogStyles}</style>
      <div class="backdrop" role="presentation"></div>
      <section class="dialog" role="dialog" aria-modal="true" aria-label="Confirm workspace">
        <div class="eyebrow">Confirm workspace</div>
        <h2>Use ${escapeHtml(confirmation.organizationName)} here?</h2>
        <p>
          Answers will be generated for <code>${escapeHtml(confirmation.host)}</code>
          using the active Comp AI workspace.
        </p>
        <div class="org">${escapeHtml(confirmation.organizationName)}</div>
        <div class="actions">
          <button class="secondary" data-action="cancel">Cancel</button>
          <button class="primary" data-action="confirm">Confirm</button>
        </div>
      </section>
    `;

    const close = (confirmed: boolean): void => {
      host.remove();
      resolve(confirmed);
    };

    shadow.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      close(false);
    });
    shadow.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
      close(true);
    });
  });
}

const dialogStyles = `
  :host {
    color: #111827;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  * {
    box-sizing: border-box;
  }
  .backdrop {
    background: rgb(9 9 11 / 38%);
    inset: 0;
    position: fixed;
    z-index: 2147483646;
  }
  .dialog {
    background: #ffffff;
    border: 1px solid #e4e4e7;
    border-radius: 12px;
    box-shadow: 0 12px 32px -8px rgb(16 24 40 / 12%);
    box-sizing: border-box;
    display: grid;
    gap: 12px;
    left: 50%;
    padding: 18px;
    position: fixed;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(380px, calc(100vw - 32px));
    z-index: 2147483647;
    color: #111827;
  }
  .eyebrow {
    color: #4b5563;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }
  h2 {
    color: #111827;
    font-size: 17px;
    line-height: 22px;
    margin: 0;
  }
  p {
    color: #374151;
    font-size: 13px;
    line-height: 18px;
    margin: 0;
  }
  code {
    background: #f4f4f5;
    border-radius: 4px;
    color: #111827;
    padding: 1px 4px;
  }
  .org {
    background: #ecfdf3;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    color: #064e3b;
    font-size: 13px;
    font-weight: 700;
    padding: 10px;
  }
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  button {
    border-radius: 6px;
    color: #111827;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    min-height: 34px;
    padding: 7px 12px;
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
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
