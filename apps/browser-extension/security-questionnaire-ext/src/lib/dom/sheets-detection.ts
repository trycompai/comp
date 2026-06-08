import { parseSheetIdentity } from '../sheet-mapping';
import type { DetectedQuestion, SheetMapping } from '../types';
import {
  csvToTable,
  parseGvizTable,
  type GvizTable,
} from './sheets-table';
import { tableToQuestions } from './sheets-question-cells';

export { matrixToQuestions, tableToQuestions } from './sheets-question-cells';

interface SheetLocation {
  hash: string;
  pathname: string;
}

interface SheetFetchResponse {
  ok: boolean;
  text(): Promise<string>;
}

type SheetFetch = (
  url: string,
  init: { credentials: 'include' },
) => Promise<SheetFetchResponse>;

interface Endpoint {
  url: string;
  parse(text: string): GvizTable | null;
}

export async function detectSheetQuestions(params: {
  location: SheetLocation;
  fetcher?: SheetFetch;
  mapping?: SheetMapping | null;
}): Promise<DetectedQuestion[]> {
  const identity = parseSheetIdentity(params.location);
  if (!identity) return [];

  const fetcher = params.fetcher ?? fetch;
  for (const endpoint of getEndpoints({
    spreadsheetId: identity.spreadsheetId,
    gid: identity.gid,
    preferCsv: true,
  })) {
    const table = await fetchTable({
      fetcher,
      url: endpoint.url,
      parse: endpoint.parse,
    });
    if (!table) continue;

    const questions = tableToQuestions({
      table,
      gid: identity.gid,
      mapping: params.mapping,
    });
    if (questions.length > 0) return questions;
  }

  return [];
}

function getEndpoints(params: {
  spreadsheetId: string;
  gid: string;
  preferCsv: boolean;
}): Endpoint[] {
  const encodedId = encodeURIComponent(params.spreadsheetId);
  const encodedGid = encodeURIComponent(params.gid);
  const base = `https://docs.google.com/spreadsheets/d/${encodedId}`;
  const jsonEndpoint: Endpoint = {
    url: `${base}/gviz/tq?tqx=out:json&gid=${encodedGid}`,
    parse: parseGvizTable,
  };
  const gvizCsvEndpoint: Endpoint = {
    url: `${base}/gviz/tq?tqx=out:csv&gid=${encodedGid}`,
    parse: csvToTable,
  };
  const exportCsvEndpoint: Endpoint = {
    url: `${base}/export?format=csv&id=${encodedId}&gid=${encodedGid}`,
    parse: csvToTable,
  };
  return params.preferCsv
    ? [gvizCsvEndpoint, exportCsvEndpoint, jsonEndpoint]
    : [jsonEndpoint, gvizCsvEndpoint, exportCsvEndpoint];
}

async function fetchTable(params: {
  fetcher: SheetFetch;
  url: string;
  parse: (text: string) => GvizTable | null;
}): Promise<GvizTable | null> {
  const response = await params.fetcher(params.url, { credentials: 'include' });
  if (!response.ok) return null;
  return params.parse(await response.text());
}
