import { describe, expect, it } from 'vitest';
import { parseRemediation, safeHttpUrl } from './remediation-parser';

describe('parseRemediation', () => {
  it('parses a full GCP remediation with nextSteps + reference + compliance', () => {
    const input =
      'Set the appropriate value for the enableNetworkPolicy field. See https://cloud.google.com/docs.\n\n' +
      'More info: https://cloud.google.com/security-command-center/docs/cluster\n\n' +
      'Compliance: cis 1.0 (5.6.7); pci 3.2.1 (1.2.1, 1.3.1); nist 800-53 (SC-7)';

    const parsed = parseRemediation(input);

    expect(parsed.steps).toBe(
      'Set the appropriate value for the enableNetworkPolicy field. See https://cloud.google.com/docs.',
    );
    expect(parsed.referenceUrl).toBe(
      'https://cloud.google.com/security-command-center/docs/cluster',
    );
    expect(parsed.compliance).toEqual([
      { standard: 'cis', version: '1.0', ids: ['5.6.7'] },
      { standard: 'pci', version: '3.2.1', ids: ['1.2.1', '1.3.1'] },
      { standard: 'nist', version: '800-53', ids: ['SC-7'] },
    ]);
  });

  it('returns AWS-style remediation (single paragraph) verbatim as steps', () => {
    const input =
      "Use s3:PutBucketEncryptionCommand with Bucket set to 'my-bucket' " +
      "and ServerSideEncryptionConfiguration containing SSEAlgorithm 'AES256'.";

    const parsed = parseRemediation(input);

    expect(parsed.steps).toBe(input);
    expect(parsed.referenceUrl).toBeNull();
    expect(parsed.compliance).toEqual([]);
  });

  it('handles GCP findings that have only nextSteps (no reference, no compliance)', () => {
    const input = 'Review the IAM policy and remove primitive role grants.';

    const parsed = parseRemediation(input);

    expect(parsed.steps).toBe(input);
    expect(parsed.referenceUrl).toBeNull();
    expect(parsed.compliance).toEqual([]);
  });

  it('handles a reference URL without compliance section', () => {
    const input =
      'Enable Cloud Audit Logs for the project.\n\n' +
      'More info: https://cloud.google.com/audit-logs';

    const parsed = parseRemediation(input);

    expect(parsed.steps).toBe('Enable Cloud Audit Logs for the project.');
    expect(parsed.referenceUrl).toBe('https://cloud.google.com/audit-logs');
    expect(parsed.compliance).toEqual([]);
  });

  it('handles compliance frameworks with multiple IDs each', () => {
    const input =
      'Fix the issue.\n\nCompliance: cis 1.0 (1.1, 1.2, 1.3); pci 3.2.1 (2.1.1, 2.2.2)';

    const parsed = parseRemediation(input);

    expect(parsed.steps).toBe('Fix the issue.');
    expect(parsed.compliance).toEqual([
      { standard: 'cis', version: '1.0', ids: ['1.1', '1.2', '1.3'] },
      { standard: 'pci', version: '3.2.1', ids: ['2.1.1', '2.2.2'] },
    ]);
  });

  it('keeps multi-paragraph steps intact when no metadata sections are present', () => {
    const input = 'First do this.\n\nThen do that.\n\nFinally verify.';

    const parsed = parseRemediation(input);

    expect(parsed.steps).toBe(input);
    expect(parsed.referenceUrl).toBeNull();
    expect(parsed.compliance).toEqual([]);
  });

  it('handles malformed compliance entries by surfacing the raw label', () => {
    const input = 'Fix it.\n\nCompliance: weird-format-no-parens; cis 1.0 (5.1)';

    const parsed = parseRemediation(input);

    expect(parsed.compliance).toEqual([
      { standard: 'weird-format-no-parens', version: null, ids: [] },
      { standard: 'cis', version: '1.0', ids: ['5.1'] },
    ]);
  });

  it('ignores empty "More info: " line so the UI does not render a broken link', () => {
    const input = 'Do something.\n\nMore info: ';

    const parsed = parseRemediation(input);

    expect(parsed.steps).toBe('Do something.');
    expect(parsed.referenceUrl).toBeNull();
  });

  it('preserves Azure remediation steps joined by newlines', () => {
    // Azure remediation steps come as `array.join('\n')`, not '\n\n'.
    const input =
      '1. Open Microsoft Defender for Cloud.\n2. Click Resolve.\n3. Apply the recommended fix.';

    const parsed = parseRemediation(input);

    expect(parsed.steps).toBe(input);
    expect(parsed.referenceUrl).toBeNull();
    expect(parsed.compliance).toEqual([]);
  });

  it('trims whitespace around sections without losing content', () => {
    const input =
      '  Steps text.   \n\n  More info: https://example.com  \n\n  Compliance: cis 1.0 (1.1)  ';

    const parsed = parseRemediation(input);

    expect(parsed.steps).toBe('Steps text.');
    expect(parsed.referenceUrl).toBe('https://example.com');
    expect(parsed.compliance).toEqual([
      { standard: 'cis', version: '1.0', ids: ['1.1'] },
    ]);
  });
});

describe('safeHttpUrl', () => {
  it('returns http URLs unchanged', () => {
    expect(safeHttpUrl('http://example.com/path')).toBe('http://example.com/path');
  });

  it('returns https URLs unchanged', () => {
    expect(safeHttpUrl('https://cloud.google.com/docs')).toBe(
      'https://cloud.google.com/docs',
    );
  });

  it('rejects javascript: URLs', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: URLs', () => {
    expect(safeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('rejects vbscript: URLs', () => {
    expect(safeHttpUrl('vbscript:msgbox(1)')).toBeNull();
  });

  it('rejects file: URLs', () => {
    expect(safeHttpUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects relative URLs (no protocol)', () => {
    expect(safeHttpUrl('//evil.example/path')).toBeNull();
    expect(safeHttpUrl('/relative/path')).toBeNull();
  });

  it('rejects malformed URLs', () => {
    expect(safeHttpUrl('not a url at all')).toBeNull();
    expect(safeHttpUrl('')).toBeNull();
  });

  it('rejects null input', () => {
    expect(safeHttpUrl(null)).toBeNull();
  });

  it('case-insensitively rejects upper-case JAVASCRIPT:', () => {
    // `new URL` normalizes the protocol to lowercase, so we still match the
    // safe-list correctly even if attacker uses unusual casing.
    expect(safeHttpUrl('JavaScript:alert(1)')).toBeNull();
  });
});
