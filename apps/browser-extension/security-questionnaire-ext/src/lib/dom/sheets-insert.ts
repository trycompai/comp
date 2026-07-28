import { buildSheetPastePlan } from '../sheets-paste-plan';

interface SheetAnswer {
  fieldId: string;
  answer: string;
}

export async function prepareSheetPaste(params: {
  answers: SheetAnswer[];
  root: Document;
}): Promise<{ insertedIds: string[]; failedIds: string[] }> {
  const plan = buildSheetPastePlan(params.answers);
  if (!plan) return { insertedIds: [], failedIds: params.answers.map((entry) => entry.fieldId) };

  await copyText(plan.tsv, params.root);
  const confirmed = await showPasteDialog({
    root: params.root,
    count: plan.targetIds.length,
    range: plan.range,
    onCopyAgain: () => copyText(plan.tsv, params.root),
  });

  return confirmed
    ? { insertedIds: plan.targetIds, failedIds: plan.failedIds }
    : { insertedIds: [], failedIds: params.answers.map((entry) => entry.fieldId) };
}

async function copyText(text: string, root: Document): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text).catch(() => copyTextWithSelection({
      root,
      text,
    }));
    return;
  }

  await copyTextWithSelection({ root, text });
}

async function copyTextWithSelection(params: {
  root: Document;
  text: string;
}): Promise<void> {
  const textarea = params.root.createElement('textarea');
  textarea.value = params.text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  params.root.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = params.root.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Unable to copy answers to the clipboard.');
}

function showPasteDialog(params: {
  root: Document;
  count: number;
  range: string;
  onCopyAgain(): Promise<void>;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const host = params.root.createElement('div');
    host.dataset.compSqRoot = 'true';
    params.root.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${pasteDialogStyles}</style>
      <section class="dialog" role="dialog" aria-modal="true">
        <h2>Paste answers into Google Sheets</h2>
        <p>${params.count} answer${params.count === 1 ? '' : 's'} copied for <code>${params.range}</code>.</p>
        <p>Click the first answer cell in that range, paste, then confirm.</p>
        <div class="actions">
          <button class="secondary" data-action="copy">Copy again</button>
          <button class="secondary" data-action="cancel">Cancel</button>
          <button class="primary" data-action="confirm">I pasted it</button>
        </div>
      </section>
    `;

    const close = (confirmed: boolean): void => {
      host.remove();
      resolve(confirmed);
    };
    shadow.querySelector('[data-action="copy"]')?.addEventListener('click', () => {
      void params.onCopyAgain();
    });
    shadow.querySelector('[data-action="cancel"]')?.addEventListener('click', () => close(false));
    shadow.querySelector('[data-action="confirm"]')?.addEventListener('click', () => close(true));
  });
}

const pasteDialogStyles = `
  :host { color: #09090b; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .dialog { background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; box-shadow: 0 12px 32px -8px rgb(16 24 40 / 12%); box-sizing: border-box; display: grid; gap: 10px; padding: 16px; position: fixed; right: 24px; top: 80px; width: min(360px, calc(100vw - 48px)); z-index: 2147483647; }
  h2 { font-size: 16px; line-height: 22px; margin: 0; }
  p { color: #52525b; font-size: 13px; line-height: 18px; margin: 0; }
  code { background: #f4f4f5; border-radius: 4px; padding: 1px 4px; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; }
  button { border-radius: 6px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 800; min-height: 32px; padding: 6px 10px; }
  .primary { background: #09090b; border: 1px solid #09090b; color: #fff; }
  .secondary { background: #fff; border: 1px solid #d4d4d8; color: #3f3f46; }
`;
