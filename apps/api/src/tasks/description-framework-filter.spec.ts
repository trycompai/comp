import { filterDescriptionByFrameworks } from './description-framework-filter';

describe('filterDescriptionByFrameworks', () => {
  it('returns the description unchanged when no active frameworks are provided', () => {
    const desc =
      'General task.\n\nFor ISO 27001: Store NDA evidence.\n\nFor PCI: Document checks.';
    expect(filterDescriptionByFrameworks(desc, [])).toBe(desc);
  });

  it('returns empty string for empty description', () => {
    expect(filterDescriptionByFrameworks('', ['SOC 2'])).toBe('');
  });

  it('keeps paragraphs that match an active framework', () => {
    const desc =
      'Maintain a list.\n\nFor ISO 27001: Store NDA evidence.\n\nFor PCI: Document checks.';
    const result = filterDescriptionByFrameworks(desc, ['ISO 27001']);
    expect(result).toContain('Maintain a list.');
    expect(result).toContain('For ISO 27001: Store NDA evidence.');
    expect(result).not.toContain('For PCI');
  });

  it('removes paragraphs for inactive frameworks', () => {
    const desc =
      'General description.\n\nFor HIPAA: Know which devices hold patient data.\n\nFor GDPR: Document lawful basis.';
    const result = filterDescriptionByFrameworks(desc, ['SOC 2']);
    expect(result).toBe('General description.');
  });

  it('keeps all framework paragraphs when all are active', () => {
    const desc =
      'Base task.\n\nFor ISO 27001: ISO requirement.\n\nFor HIPAA: HIPAA requirement.';
    const result = filterDescriptionByFrameworks(desc, [
      'ISO 27001',
      'HIPAA',
    ]);
    expect(result).toContain('For ISO 27001');
    expect(result).toContain('For HIPAA');
    expect(result).toContain('Base task.');
  });

  it('handles alias matching (e.g. "PCI" matches "PCI DSS")', () => {
    const desc =
      'Base.\n\nFor PCI: PCI-specific info.\n\nFor ISO 27001: ISO info.';
    const result = filterDescriptionByFrameworks(desc, ['PCI DSS']);
    expect(result).toContain('For PCI');
    expect(result).not.toContain('For ISO 27001');
  });

  it('handles case-insensitive matching', () => {
    const desc = 'Base.\n\nFor HIPAA: Some requirement.';
    const result = filterDescriptionByFrameworks(desc, ['hipaa']);
    expect(result).toContain('For HIPAA');
  });

  it('keeps paragraphs without framework prefixes', () => {
    const desc =
      'Upload a screenshot.\n\nProvide documentation.\n\nFor GDPR: Document lawful basis.';
    const result = filterDescriptionByFrameworks(desc, ['SOC 2']);
    expect(result).toContain('Upload a screenshot.');
    expect(result).toContain('Provide documentation.');
    expect(result).not.toContain('GDPR');
  });

  it('keeps unknown framework labels as a safe default', () => {
    const desc = 'Base.\n\nFor CustomFramework: Custom requirement.';
    const result = filterDescriptionByFrameworks(desc, ['SOC 2']);
    expect(result).toContain('For CustomFramework');
  });

  it('handles the real-world Employee Verification example', () => {
    const desc =
      'Maintain a list of reference checks you made for every new hire. Verify the identity of every new hire.\n\nFor ISO 27001: Ensure you are also storing the NDA, candidate evaluation form and access creation request with its approval evidence\n\nFor PCI: For employees with potential access to the CDE, document background verification checks (e.g., reference check, prior employment) before granting access to CHD systems.';

    // Org only has SOC 2 active
    const soc2Only = filterDescriptionByFrameworks(desc, ['SOC 2']);
    expect(soc2Only).toBe(
      'Maintain a list of reference checks you made for every new hire. Verify the identity of every new hire.',
    );

    // Org has ISO 27001 active
    const iso = filterDescriptionByFrameworks(desc, ['ISO 27001']);
    expect(iso).toContain('For ISO 27001');
    expect(iso).not.toContain('For PCI');
  });

  it('handles the real-world Asset Inventory with HIPAA example', () => {
    const desc =
      'Keep and maintain a list of your devices (laptops/servers). If you install the Comp AI agent on your devices, these will be automatically tracked in-app and you can mark this task as not-relevant.\n\nFor HIPAA: Know which devices hold your patient data is going and create a maintain a system to track it\n\nComp AI device agent is located at: portal.trycomp.ai';

    const soc2Only = filterDescriptionByFrameworks(desc, ['SOC 2']);
    expect(soc2Only).toContain('Keep and maintain a list');
    expect(soc2Only).not.toContain('HIPAA');
    expect(soc2Only).toContain('Comp AI device agent');
  });

  it('handles SOC 2 v.1 seed name variant', () => {
    const desc = 'Base.\n\nFor HIPAA: HIPAA info.';
    const result = filterDescriptionByFrameworks(desc, ['SOC 2 v.1']);
    expect(result).not.toContain('HIPAA');
  });
});
