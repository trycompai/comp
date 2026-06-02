import {
  deriveContextIssues,
  EXTERNAL_ISSUE_CATEGORIES,
  INTERNAL_ISSUE_CATEGORIES,
  type ContextDerivationInput,
} from './context-derivation';

const baseInput: ContextDerivationInput = {
  frameworkNames: ['ISO 27001'],
  vendorCount: 5,
  subProcessorCount: 2,
  vendorsByCategory: { cloud: 2, software_as_a_service: 3 },
  memberCount: 12,
  membersByDepartment: { it: 4, hr: 2, none: 6 },
  deviceCount: 8,
};

describe('deriveContextIssues', () => {
  it('produces both internal and external issues with provenance', () => {
    const issues = deriveContextIssues(baseInput);

    expect(issues.length).toBeGreaterThanOrEqual(4);
    expect(issues.length).toBeLessThanOrEqual(8);
    expect(issues.some((i) => i.kind === 'external')).toBe(true);
    expect(issues.some((i) => i.kind === 'internal')).toBe(true);
    expect(issues.every((i) => i.source === 'derived')).toBe(true);
    expect(issues.every((i) => i.derivedFrom.length > 0)).toBe(true);
    expect(issues.every((i) => i.effect.length > 0)).toBe(true);
  });

  it('assigns sequential positions', () => {
    const issues = deriveContextIssues(baseInput);
    issues.forEach((issue, index) => expect(issue.position).toBe(index));
  });

  it('emits one external framework issue per active framework', () => {
    const issues = deriveContextIssues({
      ...baseInput,
      frameworkNames: ['ISO 27001', 'SOC 2'],
    });
    const frameworkIssues = issues.filter((i) =>
      i.derivedFrom.startsWith('framework:'),
    );
    expect(frameworkIssues).toHaveLength(2);
    expect(frameworkIssues.map((i) => i.derivedFrom)).toEqual([
      'framework:ISO 27001',
      'framework:SOC 2',
    ]);
  });

  it('includes a sub-processor data-protection issue when sub-processors exist', () => {
    const issues = deriveContextIssues(baseInput);
    expect(issues.some((i) => i.derivedFrom === 'subprocessors')).toBe(true);
  });

  it('emits a remote-work issue when there are no devices', () => {
    const issues = deriveContextIssues({ ...baseInput, deviceCount: 0 });
    const deviceIssue = issues.find((i) => i.derivedFrom === 'devices');
    expect(deviceIssue?.description).toContain('remote');
  });

  it('is deterministic for identical input', () => {
    expect(deriveContextIssues(baseInput)).toEqual(
      deriveContextIssues(baseInput),
    );
  });
});

describe('deriveContextIssues — categories', () => {
  it('tags framework issues as Regulatory & Legal', () => {
    const issue = deriveContextIssues(baseInput).find((i) =>
      i.derivedFrom.startsWith('framework:'),
    );
    expect(issue?.category).toBe('Regulatory & Legal');
  });

  it('tags the vendor issue as Technological', () => {
    const issue = deriveContextIssues(baseInput).find(
      (i) => i.kind === 'external' && i.derivedFrom === 'vendors',
    );
    expect(issue?.category).toBe('Technological');
  });

  it('tags the sub-processor issue as Regulatory & Legal', () => {
    const issue = deriveContextIssues(baseInput).find(
      (i) => i.derivedFrom === 'subprocessors',
    );
    expect(issue?.category).toBe('Regulatory & Legal');
  });

  it('tags the workforce issue as Governance & Structure', () => {
    const issue = deriveContextIssues(baseInput).find(
      (i) => i.derivedFrom === 'members',
    );
    expect(issue?.category).toBe('Governance & Structure');
  });

  it('tags cloud-footprint and device issues as Capabilities & Resources', () => {
    const issues = deriveContextIssues(baseInput);
    const cloud = issues.find(
      (i) => i.kind === 'internal' && i.derivedFrom === 'vendors',
    );
    const device = issues.find((i) => i.derivedFrom === 'devices');
    expect(cloud?.category).toBe('Capabilities & Resources');
    expect(device?.category).toBe('Capabilities & Resources');
  });

  it('tags the remote-work fallback issue as Capabilities & Resources', () => {
    const issue = deriveContextIssues({ ...baseInput, deviceCount: 0 }).find(
      (i) => i.derivedFrom === 'devices',
    );
    expect(issue?.description).toContain('remote');
    expect(issue?.category).toBe('Capabilities & Resources');
  });

  it('only uses categories from the published taxonomy', () => {
    const valid = new Set<string>([
      ...EXTERNAL_ISSUE_CATEGORIES,
      ...INTERNAL_ISSUE_CATEGORIES,
    ]);
    for (const issue of deriveContextIssues(baseInput)) {
      expect(valid.has(issue.category)).toBe(true);
    }
  });
});
