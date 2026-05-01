import { describe, expect, it } from 'vitest';
import { RISK_MITIGATION_PROMPT } from './risk-mitigation';

describe('RISK_MITIGATION_PROMPT', () => {
  it('mentions linked tasks and linked controls in the inputs section', () => {
    expect(RISK_MITIGATION_PROMPT).toContain('Linked Tasks');
    expect(RISK_MITIGATION_PROMPT).toContain('Linked Controls');
    expect(RISK_MITIGATION_PROMPT).toContain('Available Organization Policies');
  });

  it('contains the grounding rule against fabrication', () => {
    expect(RISK_MITIGATION_PROMPT).toMatch(/GROUNDING RULE/);
    expect(RISK_MITIGATION_PROMPT).toMatch(/Never invent codes, task names, or policy names/);
  });

  it('locks the output bullet count', () => {
    expect(RISK_MITIGATION_PROMPT).toContain('Output EXACTLY 5 bullets');
  });
});
