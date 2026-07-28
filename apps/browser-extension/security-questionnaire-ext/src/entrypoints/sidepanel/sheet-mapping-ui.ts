import type { SheetMapping } from '../../lib/types';

export function renderSheetMappingBar(params: {
  mapping: SheetMapping | null;
  surface: string;
}): string {
  if (params.surface !== 'sheets') return '';
  if (!params.mapping) {
    return `
      <section class="sheet-map">
        <div class="sheet-map-text">
          <span class="eyebrow">Sheet mapping</span>
          <strong>Set question and answer columns</strong>
          <span>No saved mapping for this tab.</span>
        </div>
        <button class="secondary xs" data-action="change-sheet-mapping">Set</button>
      </section>
    `;
  }

  const badge = params.mapping.confirmed ? 'Saved' : 'Auto';
  return `
    <section class="sheet-map">
      <div class="sheet-map-text">
        <span class="eyebrow">Sheet mapping</span>
        <strong>Questions ${escapeHtml(params.mapping.questionColumn)} · Answers ${escapeHtml(params.mapping.answerColumn)}</strong>
        <span>Rows ${escapeHtml(formatRows(params.mapping))}</span>
      </div>
      <span class="map-pill ${params.mapping.confirmed ? 'confirmed' : 'auto'}">${badge}</span>
      <button class="secondary xs" data-action="change-sheet-mapping">Change</button>
    </section>
  `;
}

export function renderSheetMappingDialog(mapping: SheetMapping): string {
  return `
    <div class="modal">
      <div class="backdrop"></div>
      <section class="dialog">
        <form class="sheet-map-form" data-sheet-mapping-form>
          <div class="eyebrow">Sheet mapping</div>
          <h2>Review answer targets</h2>
          <div class="map-grid">
            ${inputField({
              label: 'Question column',
              name: 'questionColumn',
              value: mapping.questionColumn,
            })}
            ${inputField({
              label: 'Answer column',
              name: 'answerColumn',
              value: mapping.answerColumn,
            })}
            ${numberField({
              label: 'Start row',
              name: 'startRow',
              value: String(mapping.startRow),
            })}
            ${numberField({
              label: 'End row',
              name: 'endRow',
              value: mapping.endRow ? String(mapping.endRow) : '',
            })}
          </div>
          <p class="form-error" data-sheet-mapping-error hidden></p>
          <div class="dialog-actions">
            <button class="secondary" type="button" data-dialog="cancel">Cancel</button>
            <button class="primary" type="submit" data-dialog="confirm">Save mapping</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function inputField(params: {
  label: string;
  name: string;
  value: string;
}): string {
  return `
    <label>
      <span>${escapeHtml(params.label)}</span>
      <input
        autocomplete="off"
        maxlength="3"
        name="${escapeHtml(params.name)}"
        pattern="[A-Za-z]+"
        required
        value="${escapeHtml(params.value)}"
      />
    </label>
  `;
}

function numberField(params: {
  label: string;
  name: string;
  value: string;
}): string {
  return `
    <label>
      <span>${escapeHtml(params.label)}</span>
      <input
        min="1"
        name="${escapeHtml(params.name)}"
        type="number"
        value="${escapeHtml(params.value)}"
      />
    </label>
  `;
}

function formatRows(mapping: SheetMapping): string {
  return mapping.endRow ? `${mapping.startRow}-${mapping.endRow}` : `${mapping.startRow}+`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
