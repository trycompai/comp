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

  const mapping = params.state.queue.sheetMapping ??
    createDefaultSheetMapping(identity);
  const draft = await showSheetMappingDialog(
    renderSheetMappingDialog(mapping),
  );
  if (!draft) return;

  const response = await browser.runtime.sendMessage({
    type: 'comp:set-sheet-mapping',
    mapping: createManualSheetMapping({ identity, draft }),
  });
  if (!isOkResponse(response)) {
    params.setStatus(getResponseError(response));
    return;
  }

  await params.refreshFromPage();
}
