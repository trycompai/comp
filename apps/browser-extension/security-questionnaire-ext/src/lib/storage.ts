import { browser } from 'wxt/browser';

const SELECTED_ORG_KEY = 'comp.securityQuestionnaire.selectedOrganizationId';
const CONFIRMED_DOMAINS_KEY = 'comp.securityQuestionnaire.confirmedDomains';
const DETECTION_ENABLED_KEY = 'comp.securityQuestionnaire.detectionEnabled';

export async function getSelectedOrganizationId(): Promise<string | null> {
  const result = await browser.storage.local.get(SELECTED_ORG_KEY);
  const value = result[SELECTED_ORG_KEY];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function setSelectedOrganizationId(
  organizationId: string,
): Promise<void> {
  const trimmed = organizationId.trim();
  if (trimmed.length === 0) return;
  await browser.storage.local.set({ [SELECTED_ORG_KEY]: trimmed });
}

/**
 * `browser.storage.local` has no transaction, so a read-merge-write from two
 * contexts can drop one of the writes. Serializing them here keeps the
 * confirmed-domain and detection maps consistent.
 */
let pendingWrite: Promise<unknown> = Promise.resolve();

function serializeWrite<T>(run: () => Promise<T>): Promise<T> {
  const result = pendingWrite.then(run, run);
  pendingWrite = result.catch(() => undefined);
  return result;
}

export async function getConfirmedDomains(): Promise<Record<string, string>> {
  const result = await browser.storage.local.get(CONFIRMED_DOMAINS_KEY);
  return readStringMap(result[CONFIRMED_DOMAINS_KEY]);
}

export async function setConfirmedDomain(params: {
  host: string;
  organizationId: string;
}): Promise<void> {
  await serializeWrite(async () => {
    const domains = await getConfirmedDomains();
    await browser.storage.local.set({
      [CONFIRMED_DOMAINS_KEY]: {
        ...domains,
        [params.host]: params.organizationId,
      },
    });
  });
}

export async function clearConfirmedDomains(): Promise<void> {
  await browser.storage.local.set({ [CONFIRMED_DOMAINS_KEY]: {} });
}

export async function isDomainConfirmed(params: {
  host: string;
  organizationId: string;
}): Promise<boolean> {
  const domains = await getConfirmedDomains();
  return domains[params.host] === params.organizationId;
}

export async function getDetectionEnabled(host: string): Promise<boolean> {
  const result = await browser.storage.local.get(DETECTION_ENABLED_KEY);
  const settings = readBooleanMap(result[DETECTION_ENABLED_KEY]);
  return settings[host] ?? true;
}

export async function setDetectionEnabled(params: {
  host: string;
  enabled: boolean;
}): Promise<void> {
  await serializeWrite(async () => {
    const result = await browser.storage.local.get(DETECTION_ENABLED_KEY);
    const settings = readBooleanMap(result[DETECTION_ENABLED_KEY]);
    await browser.storage.local.set({
      [DETECTION_ENABLED_KEY]: {
        ...settings,
        [params.host]: params.enabled,
      },
    });
  });
}

function readStringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  return Object.fromEntries(entries);
}

function readBooleanMap(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value).filter(
    (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
  );
  return Object.fromEntries(entries);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
