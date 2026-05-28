import { describe, it, expect } from 'vitest';
import { extractOrgFrameworkTypes } from './use-findings-api';

// Mirrors the wrapped shape useApiSWR returns: { data: <API response> }.
// The list endpoint at /v1/frameworks returns { data: [...], count, ... }.
function swrPayload(items: Array<{ framework?: { name: string }; name?: string }>) {
  return { data: { data: items, count: items.length } };
}

describe('extractOrgFrameworkTypes', () => {
  it('returns an empty list while frameworks are still loading', () => {
    expect(extractOrgFrameworkTypes(undefined)).toEqual([]);
  });

  it('returns an empty list when the org has no frameworks', () => {
    expect(extractOrgFrameworkTypes(swrPayload([]))).toEqual([]);
  });

  it('matches SOC 2 by canonical platform name', () => {
    const result = extractOrgFrameworkTypes(
      swrPayload([{ framework: { name: 'SOC 2' } }]),
    );
    expect(result).toEqual(['soc2']);
  });

  it('matches every platform framework currently in the dropdown', () => {
    const result = extractOrgFrameworkTypes(
      swrPayload([
        { framework: { name: 'SOC 2' } },
        { framework: { name: 'ISO 27001' } },
        { framework: { name: 'PCI DSS' } },
        { framework: { name: 'HIPAA' } },
        { framework: { name: 'GDPR' } },
        { framework: { name: 'ISO 9001' } },
        { framework: { name: 'ISO 42001' } },
      ]),
    );
    expect(result.sort()).toEqual(
      ['gdpr', 'hipaa', 'iso27001', 'iso42001', 'iso9001', 'pci_dss', 'soc2'].sort(),
    );
  });

  it('reproduces the bug org_69d943ca3fbbf2c473e97b0a hit: ISO 42001 is detected', () => {
    // The customer reported by Paul has SOC 2 + ISO 42001 enabled. Before the
    // fix the dropdown only treated SOC 2 / ISO 27001 as detectable, so ISO
    // 42001 stayed greyed out even with the module enabled.
    const result = extractOrgFrameworkTypes(
      swrPayload([
        { framework: { name: 'SOC 2' } },
        { framework: { name: 'ISO 42001' } },
      ]),
    );
    expect(result.sort()).toEqual(['iso42001', 'soc2']);
  });

  it('does not confuse ISO 27001 / ISO 9001 / ISO 42001 with each other', () => {
    expect(
      extractOrgFrameworkTypes(swrPayload([{ framework: { name: 'ISO 27001' } }])),
    ).toEqual(['iso27001']);
    expect(
      extractOrgFrameworkTypes(swrPayload([{ framework: { name: 'ISO 9001' } }])),
    ).toEqual(['iso9001']);
    expect(
      extractOrgFrameworkTypes(swrPayload([{ framework: { name: 'ISO 42001' } }])),
    ).toEqual(['iso42001']);
  });

  it('tolerates versioned / locale variants of the canonical name', () => {
    // FrameworkEditorFramework seeds may carry version suffixes — make sure
    // those still resolve to the same FindingType.
    expect(
      extractOrgFrameworkTypes(
        swrPayload([{ framework: { name: 'ISO/IEC 27001:2022' } }]),
      ),
    ).toEqual(['iso27001']);
    expect(
      extractOrgFrameworkTypes(swrPayload([{ framework: { name: 'SOC 2 v.1' } }])),
    ).toEqual(['soc2']);
    expect(
      extractOrgFrameworkTypes(swrPayload([{ framework: { name: 'PCI-DSS v4.0' } }])),
    ).toEqual(['pci_dss']);
  });

  it('falls back to root-level `name` when there is no nested framework', () => {
    // Custom frameworks come back with `name` at the root and no `framework`
    // relation. The platform names we recognise won't match those, but the
    // shape must not throw.
    const result = extractOrgFrameworkTypes(
      swrPayload([{ name: 'SOC 2' }, { name: 'Custom Internal Framework' }]),
    );
    expect(result).toEqual(['soc2']);
  });

  it('deduplicates when the same framework appears twice', () => {
    const result = extractOrgFrameworkTypes(
      swrPayload([
        { framework: { name: 'SOC 2' } },
        { framework: { name: 'SOC 2' } },
      ]),
    );
    expect(result).toEqual(['soc2']);
  });

  it('ignores unknown framework names without throwing', () => {
    const result = extractOrgFrameworkTypes(
      swrPayload([
        { framework: { name: 'NIST CSF' } },
        { framework: { name: '' } },
        { framework: { name: 'SOC 2' } },
      ]),
    );
    expect(result).toEqual(['soc2']);
  });

  it('handles the flat-array envelope shape', () => {
    // Some surfaces return the array directly under `data` without the inner
    // { data, count } envelope — the helper accepts both.
    const result = extractOrgFrameworkTypes({
      data: [{ framework: { name: 'HIPAA' } }],
    });
    expect(result).toEqual(['hipaa']);
  });
});
