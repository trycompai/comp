import {
  normalizeColumnName,
} from '../../lib/sheet-columns';
import type { SheetMappingDraft } from '../../lib/sheet-mapping';

export function showSheetMappingDialog(
  html: string,
): Promise<SheetMappingDraft | null> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    const form = container.querySelector('[data-sheet-mapping-form]');
    if (!(form instanceof HTMLFormElement)) {
      container.remove();
      resolve(null);
      return;
    }

    const close = (value: SheetMappingDraft | null): void => {
      container.remove();
      resolve(value);
    };

    container
      .querySelector('[data-dialog="cancel"]')
      ?.addEventListener('click', () => close(null));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const draft = readDraft(form);
      if (!draft) return;
      close(draft);
    });
  });
}

function readDraft(form: HTMLFormElement): SheetMappingDraft | null {
  const data = new FormData(form);
  const questionColumn = readColumn(data.get('questionColumn'));
  const answerColumn = readColumn(data.get('answerColumn'));
  const startRow = readPositiveInteger(data.get('startRow'));
  const endRow = readOptionalEndRow(data.get('endRow'));

  if (!questionColumn || !answerColumn) {
    showError(form, 'Use column letters like B, C, or AA.');
    return null;
  }
  if (!startRow) {
    showError(form, 'Start row must be a positive number.');
    return null;
  }
  if (endRow !== null && endRow < startRow) {
    showError(form, 'End row must be after the start row.');
    return null;
  }

  return { questionColumn, answerColumn, startRow, endRow };
}

function readColumn(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' ? normalizeColumnName(value) : null;
}

function readPositiveInteger(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

function readOptionalEndRow(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

function showError(form: HTMLFormElement, message: string): void {
  const error = form.querySelector('[data-sheet-mapping-error]');
  if (!(error instanceof HTMLElement)) return;
  error.hidden = false;
  error.textContent = message;
}
