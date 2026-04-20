import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceWithChecks } from '../types';
import {
  buildDevicesCsv,
  DEVICES_CSV_HEADER,
  devicesCsvFilename,
  downloadDevicesCsv,
} from './devices-csv';

function makeDevice(overrides: Partial<DeviceWithChecks> = {}): DeviceWithChecks {
  return {
    id: 'dev_1',
    name: 'MacBook',
    hostname: 'macbook',
    platform: 'macos',
    osVersion: '14.0',
    serialNumber: 'SN1',
    hardwareModel: 'MBP',
    isCompliant: true,
    diskEncryptionEnabled: true,
    antivirusEnabled: true,
    passwordPolicySet: true,
    screenLockEnabled: true,
    checkDetails: null,
    lastCheckIn: '2026-04-17T12:00:00.000Z',
    agentVersion: '1.2.0',
    installedAt: '2026-01-01T00:00:00.000Z',
    memberId: 'mem_1',
    user: { name: 'Jane Doe', email: 'jane@example.com' },
    source: 'device_agent',
    complianceStatus: 'compliant',
    daysSinceLastCheckIn: 0,
    ...overrides,
  };
}

function stripBom(csv: string): string {
  return csv.replace(/^\uFEFF/, '');
}

describe('buildDevicesCsv', () => {
  it('prepends a UTF-8 BOM so Excel renders non-ASCII correctly', () => {
    const csv = buildDevicesCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('emits the fixed header row with CRLF terminator', () => {
    const csv = buildDevicesCsv([]);
    expect(stripBom(csv)).toBe(DEVICES_CSV_HEADER + '\r\n');
  });

  it('renders a compliant device in column order using CRLF line endings', () => {
    const csv = buildDevicesCsv([makeDevice()]);
    const body = stripBom(csv);
    // Trim only the trailing terminator to keep any embedded CRLFs intact.
    expect(body.endsWith('\r\n')).toBe(true);
    const [header, row] = body.slice(0, -2).split('\r\n');
    expect(header).toBe(DEVICES_CSV_HEADER);
    expect(row).toBe(
      [
        'MacBook',
        'Jane Doe',
        'jane@example.com',
        'macos',
        '14.0',
        '1.2.0',
        '2026-04-17T12:00:00.000Z',
        '0',
        'compliant',
        'yes',
        'yes',
        'yes',
        'yes',
      ].join(','),
    );
  });

  it('uses "no" for failing checks and stale status when applicable', () => {
    const csv = buildDevicesCsv([
      makeDevice({
        complianceStatus: 'stale',
        daysSinceLastCheckIn: 51,
        diskEncryptionEnabled: false,
        antivirusEnabled: false,
      }),
    ]);
    const body = stripBom(csv);
    const row = body.slice(0, -2).split('\r\n')[1];
    const cells = row.split(',');
    expect(cells).toContain('stale');
    expect(cells[7]).toBe('51'); // days since sync
    expect(cells.slice(-4)).toEqual(['no', 'no', 'yes', 'yes']);
  });

  it('represents never-synced devices with empty last-check-in and empty days', () => {
    const csv = buildDevicesCsv([
      makeDevice({
        lastCheckIn: null,
        daysSinceLastCheckIn: null,
        complianceStatus: 'stale',
      }),
    ]);
    const body = stripBom(csv);
    const cells = body.slice(0, -2).split('\r\n')[1].split(',');
    expect(cells[6]).toBe(''); // last check-in
    expect(cells[7]).toBe(''); // days since sync
    expect(cells[8]).toBe('stale');
  });

  it('escapes commas, quotes, and newlines per RFC 4180', () => {
    const csv = buildDevicesCsv([
      makeDevice({
        name: 'Device, "quoted"',
        user: { name: 'Line1\nLine2', email: 'x@y.com' },
      }),
    ]);
    const body = stripBom(csv);
    // The embedded newline is inside a quoted cell, so split on CRLF (record sep)
    // and take everything after the header row.
    const rowsPart = body.slice(0, -2).split('\r\n').slice(1).join('\r\n');
    expect(rowsPart.startsWith('"Device, ""quoted"""')).toBe(true);
    expect(rowsPart).toContain('"Line1\nLine2"');
  });

  it('handles multiple rows separated by CRLF', () => {
    const csv = buildDevicesCsv([
      makeDevice({ id: 'a', name: 'Alpha' }),
      makeDevice({ id: 'b', name: 'Beta', complianceStatus: 'non_compliant' }),
    ]);
    const body = stripBom(csv);
    const lines = body.slice(0, -2).split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith('Alpha,')).toBe(true);
    expect(lines[2].startsWith('Beta,')).toBe(true);
  });

  describe('formula injection neutralization', () => {
    function firstCell(csv: string): string {
      const body = stripBom(csv);
      const row = body.slice(0, -2).split('\r\n')[1];
      return row.split(',')[0];
    }

    it('prefixes cells starting with "=" with an apostrophe', () => {
      const csv = buildDevicesCsv([makeDevice({ name: '=CMD(A1)' })]);
      expect(firstCell(csv)).toBe("'=CMD(A1)");
    });

    it('prefixes cells starting with "+" with an apostrophe', () => {
      const csv = buildDevicesCsv([makeDevice({ name: '+1234' })]);
      expect(firstCell(csv)).toBe("'+1234");
    });

    it('prefixes cells starting with "-" with an apostrophe', () => {
      const csv = buildDevicesCsv([makeDevice({ name: '-5' })]);
      expect(firstCell(csv)).toBe("'-5");
    });

    it('prefixes cells starting with "@" with an apostrophe', () => {
      const csv = buildDevicesCsv([makeDevice({ name: '@somewhere' })]);
      expect(firstCell(csv)).toBe("'@somewhere");
    });

    it('prefixes and double-quotes cells with a leading trigger AND an embedded comma', () => {
      const csv = buildDevicesCsv([makeDevice({ name: '=EVIL,' })]);
      const body = stripBom(csv);
      const rowsPart = body.slice(0, -2).split('\r\n').slice(1).join('\r\n');
      expect(rowsPart.startsWith('"\'=EVIL,"')).toBe(true);
    });
  });
});

describe('devicesCsvFilename', () => {
  const now = new Date('2026-04-20T10:00:00Z');

  it('uses orgSlug when present', () => {
    expect(devicesCsvFilename({ orgSlug: 'acme', orgId: 'org_123', now })).toBe(
      'devices-acme-2026-04-20.csv',
    );
  });

  it('falls back to orgId when slug is empty', () => {
    expect(devicesCsvFilename({ orgSlug: '', orgId: 'org_123', now })).toBe(
      'devices-org_123-2026-04-20.csv',
    );
  });

  it('sanitizes special characters from slug', () => {
    expect(devicesCsvFilename({ orgSlug: 'acme/test', orgId: 'org_123', now })).toBe(
      'devices-acme-test-2026-04-20.csv',
    );
  });

  it('sanitizes orgId with unsafe characters', () => {
    expect(devicesCsvFilename({ orgSlug: '', orgId: 'org/123 evil\\name', now })).toBe(
      'devices-org-123-evil-name-2026-04-20.csv',
    );
  });
});

describe('downloadDevicesCsv', () => {
  const createdUrl = 'blob:mock-url';
  const createObjectURL = vi.fn<(blob: Blob) => string>();
  const revokeObjectURL = vi.fn<(url: string) => void>();
  const clickSpy = vi.fn<() => void>();
  let appendedNodes: Node[] = [];
  let removedNodes: Node[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL.mockReset().mockReturnValue(createdUrl);
    revokeObjectURL.mockReset();
    clickSpy.mockReset();
    appendedNodes = [];
    removedNodes = [];

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
      appendedNodes.push(node);
      return node;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation(<T extends Node>(node: T): T => {
      removedNodes.push(node);
      return node;
    });

    // Intercept anchor elements so we can assert on props and mock click().
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((
      tag: string,
      options?: ElementCreationOptions,
    ) => {
      const el = originalCreateElement(tag, options);
      if (tag === 'a') {
        (el as HTMLAnchorElement).click = clickSpy;
      }
      return el;
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates an anchor with filename and blob URL, then clicks and cleans up', () => {
    downloadDevicesCsv('devices-acme-2026-04-20.csv', 'header\r\nrow\r\n');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(appendedNodes).toHaveLength(1);
    const appendedNode = appendedNodes[0] as HTMLAnchorElement;
    expect(appendedNode.tagName).toBe('A');
    expect(appendedNode.download).toBe('devices-acme-2026-04-20.csv');
    expect(appendedNode.href).toContain(createdUrl);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removedNodes).toHaveLength(1);
    expect(removedNodes[0]).toBe(appendedNode);

    // revoke should be deferred via setTimeout
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith(createdUrl);
  });

  it('no-ops when document is undefined (SSR)', () => {
    // Simulate SSR by temporarily removing the document global.
    const globalWithDoc = globalThis as { document?: Document };
    const originalDocument = globalWithDoc.document;
    delete globalWithDoc.document;
    try {
      expect(() => downloadDevicesCsv('x.csv', 'data')).not.toThrow();
      expect(createObjectURL).not.toHaveBeenCalled();
    } finally {
      globalWithDoc.document = originalDocument;
    }
  });
});
