import { extensionConfig } from '../config';
import { parseSheetIdentityFromUrl } from '../sheet-mapping';
import type { TabQuestionQueue } from '../types';
import {
  buildSheetFormattingRequests,
  type SheetBatchUpdateRequest,
} from './google-sheets-formatting';
import {
  parseSheetTargets,
  resolveSheetTargets,
  type SheetAnswer,
  type SheetApiTarget,
} from './google-sheets-target-resolution';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

interface IdentityTokenDetails {
  interactive: boolean;
  scopes: string[];
}

interface ChromeIdentityApi {
  getAuthToken(details: IdentityTokenDetails): Promise<unknown>;
  removeCachedAuthToken(details: { token: string }): Promise<void>;
}

export interface SheetValueUpdate {
  fieldId: string;
  range: string;
  values: string[][];
}

export async function insertAnswersWithGoogleSheetsApi(params: {
  queue: TabQuestionQueue;
  answers: SheetAnswer[];
}): Promise<string[]> {
  if (!extensionConfig.googleSheetsApiEnabled) {
    throw new Error('Google Sheets API OAuth is not configured for this extension build.');
  }

  const spreadsheetId = getSpreadsheetId(params.queue);
  const targets = parseSheetTargets(params.answers);
  if (targets.length === 0) throw new Error('No mapped sheet answers are ready to insert.');

  const gid = targets[0].gid;
  if (targets.some((target) => target.gid !== gid)) {
    throw new Error('Answers span multiple sheet tabs. Insert one tab at a time.');
  }

  return withFreshToken(async (token) => {
    const sheetTitle = await getSheetTitle({ gid, spreadsheetId, token });
    const resolvedTargets = await resolveSheetTargets({
      queue: params.queue,
      targets,
      readColumn: (request) => readSheetColumnValues({
        ...request,
        sheetTitle,
        spreadsheetId,
        token,
      }),
    });
    const updates = buildSheetValueUpdates({ sheetTitle, targets: resolvedTargets });
    await batchUpdateValues({ spreadsheetId, token, updates });
    await batchUpdateFormatting({
      spreadsheetId,
      token,
      requests: buildSheetFormattingRequests({ gid, targets: resolvedTargets }),
    }).catch(() => undefined);
    return updates.map((update) => update.fieldId);
  });
}

export function buildSheetValueUpdates(params: {
  sheetTitle: string;
  targets: SheetApiTarget[];
}): SheetValueUpdate[] {
  return params.targets.map((target) => ({
    fieldId: target.fieldId,
    range: `${quoteSheetTitle(params.sheetTitle)}!${columnName(target.col)}${target.row}`,
    values: [[target.answer]],
  }));
}

export function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

async function withFreshToken<T>(
  operation: (token: string) => Promise<T>,
): Promise<T> {
  const token = await getGoogleAccessToken();
  try {
    return await operation(token);
  } catch (error) {
    if (!(error instanceof UnauthorizedSheetsError)) throw error;
    await getChromeIdentityApi().removeCachedAuthToken({ token });
    return operation(await getGoogleAccessToken());
  }
}

async function getGoogleAccessToken(): Promise<string> {
  const result = await getChromeIdentityApi().getAuthToken({
    interactive: true,
    scopes: [SHEETS_SCOPE],
  });
  if (typeof result === 'string' && result.length > 0) return result;
  if (isRecord(result) && typeof result.token === 'string' && result.token.length > 0) {
    return result.token;
  }
  throw new Error('Google authorization did not return an access token.');
}

function getChromeIdentityApi(): ChromeIdentityApi {
  const chromeApi = readRecordProperty(globalThis, 'chrome');
  const identity = readRecordProperty(chromeApi, 'identity');
  if (!isChromeIdentityApi(identity)) {
    throw new Error(
      'Chrome Identity API is unavailable. Rebuild the extension with WXT_GOOGLE_OAUTH_CLIENT_ID set, reload it, and confirm the manifest includes the identity permission.',
    );
  }
  return identity;
}

function readRecordProperty(
  value: unknown,
  key: string,
): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const property = value[key];
  return isRecord(property) ? property : null;
}

function isChromeIdentityApi(value: unknown): value is ChromeIdentityApi {
  return (
    isRecord(value) &&
    typeof value.getAuthToken === 'function' &&
    typeof value.removeCachedAuthToken === 'function'
  );
}

async function getSheetTitle(params: {
  gid: string;
  spreadsheetId: string;
  token: string;
}): Promise<string> {
  const fields = encodeURIComponent('sheets(properties(sheetId,title))');
  const metadata = await requestSheetsJson({
    token: params.token,
    url: `${SHEETS_API_BASE}/${encodeURIComponent(params.spreadsheetId)}?fields=${fields}`,
  });
  const title = readSheetTitle({ gid: params.gid, metadata });
  if (!title) throw new Error('Could not find the active Google Sheets tab.');
  return title;
}

async function batchUpdateValues(params: {
  spreadsheetId: string;
  token: string;
  updates: SheetValueUpdate[];
}): Promise<void> {
  await requestSheetsJson({
    token: params.token,
    url: `${SHEETS_API_BASE}/${encodeURIComponent(params.spreadsheetId)}/values:batchUpdate`,
    init: {
      method: 'POST',
      body: JSON.stringify({
        data: params.updates.map((update) => ({
          range: update.range,
          values: update.values,
        })),
        valueInputOption: 'RAW',
      }),
    },
  });
}

async function batchUpdateFormatting(params: {
  spreadsheetId: string;
  token: string;
  requests: SheetBatchUpdateRequest[];
}): Promise<void> {
  if (params.requests.length === 0) return;
  await requestSheetsJson({
    token: params.token,
    url: `${SHEETS_API_BASE}/${encodeURIComponent(params.spreadsheetId)}:batchUpdate`,
    init: {
      method: 'POST',
      body: JSON.stringify({ requests: params.requests }),
    },
  });
}

async function readSheetColumnValues(params: {
  column: string;
  endRow: number | null;
  sheetTitle: string;
  spreadsheetId: string;
  startRow: number;
  token: string;
}): Promise<string[]> {
  const end = params.endRow ?? '';
  const range = `${quoteSheetTitle(params.sheetTitle)}!${params.column}${params.startRow}:${params.column}${end}`;
  const response = await requestSheetsJson({
    token: params.token,
    url: [
      `${SHEETS_API_BASE}/${encodeURIComponent(params.spreadsheetId)}/values/`,
      encodeURIComponent(range),
      '?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE',
    ].join(''),
  });
  return readValueRows(response);
}

async function requestSheetsJson(params: {
  token: string;
  url: string;
  init?: RequestInit;
}): Promise<unknown> {
  const response = await fetch(params.url, {
    ...params.init,
    headers: {
      ...(params.init?.headers ?? {}),
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
  });
  if (response.status === 401) throw new UnauthorizedSheetsError();
  if (!response.ok) throw new Error(await readApiError(response));
  return response.json();
}

function readValueRows(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.values)) return [];
  return value.values.map((row) => {
    if (!Array.isArray(row)) return '';
    const first = row[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'number' || typeof first === 'boolean') return String(first);
    return '';
  });
}

function getSpreadsheetId(queue: TabQuestionQueue): string {
  if (queue.sheetMapping?.spreadsheetId) return queue.sheetMapping.spreadsheetId;
  const identity = parseSheetIdentityFromUrl(queue.url);
  if (!identity) throw new Error('Could not identify the active spreadsheet.');
  return identity.spreadsheetId;
}

function readSheetTitle(params: {
  gid: string;
  metadata: unknown;
}): string | null {
  if (!isRecord(params.metadata) || !Array.isArray(params.metadata.sheets)) {
    return null;
  }

  for (const sheet of params.metadata.sheets) {
    if (!isRecord(sheet) || !isRecord(sheet.properties)) continue;
    const sheetId = sheet.properties.sheetId;
    const title = sheet.properties.title;
    if (String(sheetId) === params.gid && typeof title === 'string') return title;
  }
  return null;
}

async function readApiError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      isRecord(parsed) &&
      isRecord(parsed.error) &&
      typeof parsed.error.message === 'string'
    ) {
      return parsed.error.message;
    }
  } catch {
    return `Google Sheets API request failed with HTTP ${response.status}.`;
  }
  return `Google Sheets API request failed with HTTP ${response.status}.`;
}

function columnName(column: number): string {
  let value = column;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

class UnauthorizedSheetsError extends Error {}
