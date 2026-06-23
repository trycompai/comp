import { browser } from 'wxt/browser';
import {
  parseSheetMapping,
  type SheetIdentity,
} from './sheet-mapping';
import type { SheetMapping } from './types';

const SHEET_MAPPING_PREFIX = 'comp.securityQuestionnaire.sheetMapping';

export async function getSavedSheetMapping(
  identity: SheetIdentity,
): Promise<SheetMapping | null> {
  const key = getSheetMappingKey(identity);
  const result = await browser.storage.local.get(key);
  return parseSheetMapping(result[key]);
}

export async function saveSheetMapping(
  mapping: SheetMapping,
): Promise<void> {
  await browser.storage.local.set({
    [getSheetMappingKey(mapping)]: mapping,
  });
}

function getSheetMappingKey(identity: SheetIdentity): string {
  return [
    SHEET_MAPPING_PREFIX,
    identity.spreadsheetId,
    identity.gid,
  ].join(':');
}
