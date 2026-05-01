import { describe, expect, it } from 'vitest';
import { RISK_MITIGATION_PROMPT } from './risk-mitigation';

describe('RISK_MITIGATION_PROMPT', () => {
  it('asks for exactly 5 sentences as JSON', () => {
    expect(RISK_MITIGATION_PROMPT).toMatch(/string × 5/i);
    expect(RISK_MITIGATION_PROMPT).toContain('"sentences"');
  });

  it('forbids the model from including codes or names in the sentence', () => {
    expect(RISK_MITIGATION_PROMPT).toMatch(
      /Do NOT include the code, name, or any reference to the citation in the sentence/i,
    );
  });

  it('explains the four citation kinds', () => {
    expect(RISK_MITIGATION_PROMPT).toContain('CONTROL');
    expect(RISK_MITIGATION_PROMPT).toContain('TASK');
    expect(RISK_MITIGATION_PROMPT).toContain('POLICY');
    expect(RISK_MITIGATION_PROMPT).toContain('GAP');
  });
});
