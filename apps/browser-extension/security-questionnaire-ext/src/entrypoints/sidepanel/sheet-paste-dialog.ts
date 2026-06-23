import type { SheetPastePayload } from '../../lib/sheets-paste-plan';

export function showSheetPasteDialog(
  paste: SheetPastePayload,
): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.innerHTML = renderDialog(paste);
    document.body.appendChild(container);

    const close = (confirmed: boolean): void => {
      container.remove();
      resolve(confirmed);
    };
    const handleCopy = (): void => {
      void copyText(paste.tsv).then(
        () => setStatus(container, 'Copied. Select the first answer cell, then paste.'),
        (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unable to copy answers.';
          setStatus(container, message);
        },
      );
    };

    handleCopy();
    container
      .querySelector('[data-dialog="cancel"]')
      ?.addEventListener('click', () => close(false));
    container
      .querySelector('[data-dialog="confirm"]')
      ?.addEventListener('click', () => close(true));
    container
      .querySelector('[data-dialog="copy"]')
      ?.addEventListener('click', handleCopy);
  });
}

function renderDialog(paste: SheetPastePayload): string {
  return `
    <div class="modal">
      <div class="backdrop"></div>
      <section class="dialog">
        <div class="eyebrow">Google Sheets paste</div>
        <h2>Paste ${paste.itemIds.length} answer${paste.itemIds.length === 1 ? '' : 's'}</h2>
        <p>Copied for <code>${escapeHtml(paste.range)}</code>. Select the first answer cell in that range, paste, then confirm.</p>
        <p class="paste-status" data-paste-status>Copying...</p>
        <div class="dialog-actions">
          <button class="secondary" type="button" data-dialog="copy">Copy again</button>
          <button class="secondary" type="button" data-dialog="cancel">Cancel</button>
          <button class="primary" type="button" data-dialog="confirm">I pasted it</button>
        </div>
      </section>
    </div>
  `;
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text).catch(() => copyWithSelection(text));
    return;
  }
  await copyWithSelection(text);
}

async function copyWithSelection(text: string): Promise<void> {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.left = '-9999px';
  textarea.style.position = 'fixed';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Unable to copy answers to the clipboard.');
}

function setStatus(container: HTMLElement, message: string): void {
  const status = container.querySelector('[data-paste-status]');
  if (status instanceof HTMLElement) status.textContent = message;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
