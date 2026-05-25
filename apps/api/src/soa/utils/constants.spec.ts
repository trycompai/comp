import {
  INCLUSION_JUSTIFICATIONS,
  getInclusionJustification,
} from './constants';

describe('getInclusionJustification', () => {
  it('returns the access-control justification for organisational and technical access controls', () => {
    const accessClosures = ['5.15', '5.16', '5.17', '5.18', '8.2', '8.3', '8.4', '8.5'];
    for (const closure of accessClosures) {
      expect(getInclusionJustification(closure)).toBe(
        INCLUSION_JUSTIFICATIONS.accessControl,
      );
    }
  });

  it('returns the supplier/cloud justification for 5.19–5.23', () => {
    for (const closure of ['5.19', '5.20', '5.21', '5.22', '5.23']) {
      expect(getInclusionJustification(closure)).toBe(
        INCLUSION_JUSTIFICATIONS.supplierCloud,
      );
    }
  });

  it('returns the incident-management justification for 5.24–5.30 and 6.8', () => {
    const incidentClosures = ['5.24', '5.25', '5.26', '5.27', '5.28', '5.29', '5.30', '6.8'];
    for (const closure of incidentClosures) {
      expect(getInclusionJustification(closure)).toBe(
        INCLUSION_JUSTIFICATIONS.incidentManagement,
      );
    }
  });

  it('returns the secure-development justification for 8.25–8.34', () => {
    const devClosures = ['8.25', '8.26', '8.27', '8.28', '8.29', '8.30', '8.31', '8.32', '8.33', '8.34'];
    for (const closure of devClosures) {
      expect(getInclusionJustification(closure)).toBe(
        INCLUSION_JUSTIFICATIONS.secureDevelopment,
      );
    }
  });

  it('returns the legal/privacy/compliance justification for 5.31–5.36 and data-protection technical controls', () => {
    const legalClosures = ['5.31', '5.32', '5.33', '5.34', '5.35', '5.36', '8.10', '8.11', '8.12'];
    for (const closure of legalClosures) {
      expect(getInclusionJustification(closure)).toBe(
        INCLUSION_JUSTIFICATIONS.legalPrivacyCompliance,
      );
    }
  });

  it('returns the physical/remote-working justification for 6.7 and every section-7 control', () => {
    expect(getInclusionJustification('6.7')).toBe(
      INCLUSION_JUSTIFICATIONS.physicalRemoteWorking,
    );
    for (let n = 1; n <= 14; n += 1) {
      expect(getInclusionJustification(`7.${n}`)).toBe(
        INCLUSION_JUSTIFICATIONS.physicalRemoteWorking,
      );
    }
  });

  it('returns null for controls outside the six named families', () => {
    // Organisational policies, HR, general technical controls outside the named families.
    for (const closure of ['5.1', '5.2', '6.1', '6.2', '8.1', '8.15', '8.20']) {
      expect(getInclusionJustification(closure)).toBeNull();
    }
  });

  it('returns null when the closure is missing', () => {
    expect(getInclusionJustification(null)).toBeNull();
    expect(getInclusionJustification(undefined)).toBeNull();
    expect(getInclusionJustification('')).toBeNull();
  });
});
