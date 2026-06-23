import {
  alignSheetMappingToQuestions,
  describeSheetMapping,
  inferSheetMappingFromQuestions,
  parseSheetIdentity,
  type SheetIdentity,
} from '../sheet-mapping';
import type {
  DetectedQuestion,
  ScanDebug,
  ScanDebugStep,
  SheetMapping,
} from '../types';
import {
  tableToQuestions,
} from './sheets-detection';
import {
  csvToTable,
  parseGvizTable,
  type GvizTable,
} from './sheets-table';

interface SheetLocation {
  hash: string;
  pathname: string;
}

interface Endpoint {
  name: string;
  url: string;
  parse(text: string): GvizTable | null;
}

export async function detectSheetQuestionsWithDebug(params: {
  location: SheetLocation;
  mapping?: SheetMapping | null;
}): Promise<{
  questions: DetectedQuestion[];
  debug: ScanDebug;
  mapping: SheetMapping | null;
}> {
  const steps: ScanDebugStep[] = [];
  const identity = parseSheetIdentity(params.location);
  if (!identity) {
    return buildResult({
      questions: [],
      source: 'none',
      steps: identityFailureFallbackSteps(steps),
      mapping: null,
    });
  }

  if (params.mapping) {
    steps.push({
      name: 'sheet-mapping',
      status: 'ok',
      detail: `Using saved mapping: ${describeSheetMapping(params.mapping)}.`,
    });
  }

  for (const endpoint of getEndpoints({
    identity,
    preferCsv: true,
  })) {
    const fetched = await fetchEndpoint(endpoint);
    steps.push(fetched.step);
    if (!fetched.ok) continue;

    const table = endpoint.parse(fetched.text);
    if (!table) {
      steps.push({ name: `${endpoint.name}: parse`, status: 'fail', detail: 'No table parsed.' });
      continue;
    }

    const questions = tableToQuestions({
      table,
      gid: identity.gid,
      mapping: params.mapping,
    });
    const mapping = getResultMapping({
      identity,
      mapping: params.mapping,
      questions,
    });
    steps.push({
      name: `${endpoint.name}: questions`,
      status: questions.length > 0 ? 'ok' : 'fail',
      detail: `${questions.length} questionnaire questions detected.`,
      count: questions.length,
      sample: questions[0]?.question,
    });
    if (!params.mapping && mapping) {
      steps.push({
        name: 'sheet-mapping',
        status: 'ok',
        detail: `Auto detected mapping: ${describeSheetMapping(mapping)}.`,
      });
    }
    if (questions.length > 0) {
      return buildResult({
        questions,
        source: endpoint.name,
        steps,
        mapping,
      });
    }
  }

  return buildResult({
    questions: [],
    source: 'none',
    steps: identityFailureFallbackSteps(steps),
    mapping: params.mapping ?? null,
  });
}

function identityFailureFallbackSteps(
  steps: ScanDebugStep[],
): ScanDebugStep[] {
  if (steps.length > 0) return steps;
  return [{
    name: 'sheet-url',
    status: 'fail',
    detail: 'Could not parse spreadsheet id from the current URL.',
  }];
}

function getEndpoints(params: {
  identity: SheetIdentity;
  preferCsv: boolean;
}): Endpoint[] {
  const encodedId = encodeURIComponent(params.identity.spreadsheetId);
  const encodedGid = encodeURIComponent(params.identity.gid);
  const base = `https://docs.google.com/spreadsheets/d/${encodedId}`;
  const jsonEndpoint: Endpoint = {
    name: 'background gviz json',
    url: `${base}/gviz/tq?tqx=out:json&gid=${encodedGid}`,
    parse: parseGvizTable,
  };
  const gvizCsvEndpoint: Endpoint = {
    name: 'background gviz csv',
    url: `${base}/gviz/tq?tqx=out:csv&gid=${encodedGid}`,
    parse: csvToTable,
  };
  const exportCsvEndpoint: Endpoint = {
    name: 'background export csv',
    url: `${base}/export?format=csv&id=${encodedId}&gid=${encodedGid}`,
    parse: csvToTable,
  };
  return params.preferCsv
    ? [gvizCsvEndpoint, exportCsvEndpoint, jsonEndpoint]
    : [jsonEndpoint, gvizCsvEndpoint, exportCsvEndpoint];
}

async function fetchEndpoint(endpoint: Endpoint): Promise<{
  ok: boolean;
  text: string;
  step: ScanDebugStep;
}> {
  try {
    const response = await fetch(endpoint.url, { credentials: 'include' });
    const text = await response.text();
    return {
      ok: response.ok,
      text,
      step: {
        name: endpoint.name,
        status: response.ok ? 'ok' : 'fail',
        detail: `HTTP ${response.status}; ${text.length} chars returned.`,
        sample: sampleText(text),
      },
    };
  } catch (error) {
    return {
      ok: false,
      text: '',
      step: {
        name: endpoint.name,
        status: 'fail',
        detail: error instanceof Error ? error.message : 'Fetch failed.',
      },
    };
  }
}

function buildResult(params: {
  questions: DetectedQuestion[];
  source: string;
  steps: ScanDebugStep[];
  mapping: SheetMapping | null;
}): {
  questions: DetectedQuestion[];
  debug: ScanDebug;
  mapping: SheetMapping | null;
} {
  return {
    questions: params.questions,
    debug: {
      surface: 'sheets',
      source: params.source,
      questionCount: params.questions.length,
      steps: params.steps,
      updatedAt: Date.now(),
    },
    mapping: params.mapping,
  };
}

function getResultMapping(params: {
  identity: SheetIdentity;
  mapping?: SheetMapping | null;
  questions: DetectedQuestion[];
}): SheetMapping | null {
  if (params.mapping) {
    return alignSheetMappingToQuestions({
      mapping: params.mapping,
      questions: params.questions,
    });
  }
  return inferSheetMappingFromQuestions({
    identity: params.identity,
    questions: params.questions,
  });
}

function sampleText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 160);
}
