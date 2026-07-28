import { browser } from 'wxt/browser';
import {
  getResponseError,
  isOkResponse,
} from '../../lib/response-guards';
import {
  createDefaultSheetMapping,
  createManualSheetMapping,
  parseSheetIdentityFromUrl,
} from '../../lib/sheet-mapping';
import type { PanelState } from '../../lib/types';
import { showSheetMappingDialog } from './sheet-mapping-dialog';
import { renderSheetMappingDialog } from './sheet-mapping-ui';

export async function handleSheetMappingChange(params: {
  state: PanelState | null;
  refreshFromPage(): Promise<void>;
  setStatus(message: string): void;
}): Promise<void> {
  if (!params.state) return;

  const identity = parseSheetIdentityFromUrl(params.state.queue.url);
  if (!identity) {
    params.setStatus('Open a Google Sheet and refresh before setting mapping.');
    return;
  }

  let mapping = params.state.queue.sheetMapping ??
    createDefaultSheetMapping(identity);

  // Reopen the dialog with what the user typed when the save fails, so a
  // transient error does not throw away their column mapping.
  for (;;) {
    const draft = await showSheetMappingDialog(
      renderSheetMappingDialog(mapping),
    );
    if (!draft) return;

    const nextMapping = createManualSheetMapping({ identity, draft });
    const response = await browser.runtime.sendMessage({
      type: 'comp:set-sheet-mapping',
      mapping: nextMapping,
    });
    if (isOkResponse(response)) break;

    params.setStatus(getResponseError(response));
    mapping = nextMapping;
  }

  await params.refreshFromPage();
}
