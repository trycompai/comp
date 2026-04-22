import { toRunErrorMessage } from './run-error-formatter';

describe('toRunErrorMessage', () => {
  it('classifies an isNoPage error with needsReauth=true', () => {
    const err = new Error('No Page found for awaitActivePage');
    const result = toRunErrorMessage(err);
    expect(result.needsReauth).toBe(true);
    expect(result.userFacing).toContain('Browser session ended');
  });

  it('classifies a timeout error without needsReauth', () => {
    const err = new Error('operation timed out after 30s');
    const result = toRunErrorMessage(err);
    expect(result.needsReauth).toBe(false);
    expect(result.userFacing).toContain('timed out');
  });

  it('uppercase Timeout also matches', () => {
    const err = new Error('Timeout exceeded');
    const result = toRunErrorMessage(err);
    expect(result.userFacing).toContain('timed out');
  });

  it('falls back to generic message for other errors', () => {
    const err = new Error('some very specific Stagehand crash stack');
    const result = toRunErrorMessage(err);
    expect(result.needsReauth).toBe(false);
    expect(result.userFacing).toBe(
      'Automation failed to complete. Please retry — see run error details for specifics.',
    );
    expect(result.userFacing).not.toContain('Stagehand');
  });

  it('handles non-Error values (string, unknown)', () => {
    expect(toRunErrorMessage('raw string').userFacing).toBe(
      'Automation failed to complete. Please retry — see run error details for specifics.',
    );
    expect(toRunErrorMessage({ nested: 'object' }).userFacing).toBe(
      'Automation failed to complete. Please retry — see run error details for specifics.',
    );
    expect(toRunErrorMessage(null).userFacing).toBe(
      'Automation failed to complete. Please retry — see run error details for specifics.',
    );
  });
});
