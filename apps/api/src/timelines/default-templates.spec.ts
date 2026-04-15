import {
  getDefaultTemplateForCycle,
  getDefaultTemplatesForFramework,
  GENERIC_DEFAULT_TIMELINE_TEMPLATE,
} from './default-templates';

describe('default-templates', () => {
  it('matches framework defaults using normalized names', () => {
    const soc2Templates = getDefaultTemplatesForFramework('SOC2');

    expect(soc2Templates.map((template) => template.cycleNumber).sort()).toEqual([1, 1, 2]);
  });

  it('defines independent SOC 2 tracks with their own cycle 1 templates', () => {
    const soc2Templates = getDefaultTemplatesForFramework('SOC 2');

    const cycle1Tracks = soc2Templates
      .filter((template) => template.cycleNumber === 1)
      .map((template) => template.trackKey);

    expect(cycle1Tracks.sort()).toEqual(['soc2_type1', 'soc2_type2']);
  });

  it('returns SOC 2 Type 2 default with observation phase lock enabled', () => {
    const template = getDefaultTemplateForCycle('SOC2', 1, {
      trackKey: 'soc2_type2',
    });

    expect(template?.name).toBe('SOC 2 Type 2');
    const observationPhase = template?.phases.find((phase) =>
      phase.name.toLowerCase().includes('observation'),
    );

    expect(observationPhase).toBeDefined();
    expect(observationPhase?.locksTimelineOnComplete).toBe(true);
  });

  it('sets Auditor Review phases to AUTO_FINDINGS for SOC 2 templates', () => {
    const type1 = getDefaultTemplateForCycle('SOC 2', 1, {
      trackKey: 'soc2_type1',
    });
    const type2 = getDefaultTemplateForCycle('SOC 2', 1, {
      trackKey: 'soc2_type2',
    });
    const legacyType1 = getDefaultTemplateForCycle('SOC 2 v.1', 1, {
      trackKey: 'primary',
    });

    const type1AuditorReview = type1?.phases.find((phase) => phase.name === 'Auditor Review');
    const type2AuditorReview = type2?.phases.find((phase) => phase.name === 'Auditor Review');
    const legacyAuditorReview = legacyType1?.phases.find(
      (phase) => phase.name === 'Auditor Review',
    );

    expect(type1AuditorReview?.completionType).toBe('AUTO_FINDINGS');
    expect(type2AuditorReview?.completionType).toBe('AUTO_FINDINGS');
    expect(legacyAuditorReview?.completionType).toBe('AUTO_FINDINGS');
  });

  it('defines explicit SOC 2 progression within each independent track', () => {
    const type1 = getDefaultTemplateForCycle('SOC 2', 1, {
      trackKey: 'soc2_type1',
    });
    const type2Year1 = getDefaultTemplateForCycle('SOC 2', 1, {
      trackKey: 'soc2_type2',
    });
    const renewal = getDefaultTemplateForCycle('SOC 2', 2, {
      trackKey: 'soc2_type2',
    });

    expect(type1?.templateKey).toBe('soc2_type1');
    expect(type1?.nextTemplateKey).toBe('soc2_type1');

    expect(type2Year1?.templateKey).toBe('soc2_type2_year1');
    expect(type2Year1?.nextTemplateKey).toBe('soc2_type2_renewal');

    expect(renewal?.templateKey).toBe('soc2_type2_renewal');
    expect(renewal?.nextTemplateKey).toBe('soc2_type2_renewal');
    expect(renewal?.name).toBe('SOC 2 Type 2');
  });

  it('falls back to framework defaults when an unknown track key is requested', () => {
    const template = getDefaultTemplateForCycle('SOC 2', 1, {
      trackKey: 'unknown_track',
    });

    expect(template?.frameworkName).toBe('SOC 2');
    expect(template?.name).toBe('SOC 2 Type 1');
  });

  it('returns generic fallback template when framework has no specific default', () => {
    const template = getDefaultTemplateForCycle('Custom Framework XYZ', 1);

    expect(template?.name).toBe(GENERIC_DEFAULT_TIMELINE_TEMPLATE.name);
    expect(template?.phases.length).toBe(GENERIC_DEFAULT_TIMELINE_TEMPLATE.phases.length);
    expect(template?.phases.some((phase) => phase.locksTimelineOnComplete)).toBe(false);
  });
});
