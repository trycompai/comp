export interface AttackCategory {
  code: string;
  name: string;
  description: string;
}

export const ATTACK_CATEGORIES: AttackCategory[] = [
  { code: 'INJ', name: 'Injection', description: 'SQL, NoSQL, OS command, LDAP, template' },
  { code: 'AUTH', name: 'Broken Auth', description: 'Session fixation, token leak, weak MFA' },
  { code: 'AUTHZ', name: 'Broken Access', description: 'IDOR, privilege escalation, multi-tenant' },
  { code: 'XSS', name: 'Cross-Site Scripting', description: 'Reflected, stored, DOM-based' },
  { code: 'CSRF', name: 'CSRF', description: 'State-changing requests without proof' },
  { code: 'SSRF', name: 'SSRF', description: 'Outbound requests via user-controlled URLs' },
  { code: 'XXE', name: 'XML / XXE', description: 'External entity, billion-laughs' },
  { code: 'RL', name: 'Rate Limits', description: 'Credential stuffing, enumeration' },
  { code: 'CFG', name: 'Misconfiguration', description: 'Headers, CORS, exposed admin routes' },
  { code: 'CRY', name: 'Cryptography', description: 'TLS posture, weak ciphers, JWT bugs' },
  { code: 'LEAK', name: 'Information Leak', description: 'Stack traces, version banners, debug data' },
  { code: 'LOG', name: 'Logic Flaws', description: 'Race conditions, workflow bypass' },
];
