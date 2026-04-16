jest.mock('@trycompai/auth', () => ({
  statement: {
    organization: ['read', 'update', 'delete'],
    member: ['create', 'read', 'update', 'delete'],
    invitation: ['create', 'read', 'delete'],
    team: ['create', 'read', 'update', 'delete'],
    control: ['create', 'read', 'update', 'delete'],
    evidence: ['create', 'read', 'update', 'delete'],
    policy: ['create', 'read', 'update', 'delete'],
    risk: ['create', 'read', 'update', 'delete'],
    vendor: ['create', 'read', 'update', 'delete'],
    task: ['create', 'read', 'update', 'delete'],
    framework: ['create', 'read', 'update', 'delete'],
    audit: ['create', 'read', 'update'],
    finding: ['create', 'read', 'update', 'delete'],
    questionnaire: ['create', 'read', 'update', 'delete'],
    integration: ['create', 'read', 'update', 'delete'],
    apiKey: ['create', 'read', 'delete'],
    app: ['read'],
    trust: ['read', 'update'],
    pentest: ['create', 'read', 'delete'],
    training: ['read', 'update'],
  },
}));

import { ApiKeyService } from './api-key.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;

  beforeEach(() => {
    service = new ApiKeyService();
  });

  describe('getAvailableScopes', () => {
    let scopes: string[];

    beforeEach(() => {
      scopes = service.getAvailableScopes();
    });

    it('should not include any invitation:* scopes', () => {
      const matches = scopes.filter((s) => s.startsWith('invitation:'));
      expect(matches).toEqual([]);
    });

    it('should not include any team:* scopes', () => {
      const matches = scopes.filter((s) => s.startsWith('team:'));
      expect(matches).toEqual([]);
    });

    it('should not include any compliance:* scopes', () => {
      const matches = scopes.filter((s) => s.startsWith('compliance:'));
      expect(matches).toEqual([]);
    });

    it('should include expected public resources', () => {
      const expected = [
        'risk',
        'vendor',
        'task',
        'control',
        'policy',
        'evidence',
        'framework',
        'audit',
        'finding',
        'questionnaire',
        'integration',
        'apiKey',
        'pentest',
      ];
      for (const resource of expected) {
        const matching = scopes.filter((s) => s.startsWith(`${resource}:`));
        expect(matching.length).toBeGreaterThan(0);
      }
    });

    it('should return scopes in resource:action format', () => {
      for (const scope of scopes) {
        expect(scope).toMatch(/^[a-zA-Z]+:[a-zA-Z]+$/);
      }
    });

    it('should not return an empty array', () => {
      expect(scopes.length).toBeGreaterThan(0);
    });
  });
});
