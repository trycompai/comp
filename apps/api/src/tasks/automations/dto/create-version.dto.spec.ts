import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateVersionDto } from './create-version.dto';

/**
 * The original endpoint accepted an inline, untyped `@Body()` — invisible to the
 * ValidationPipe — so a missing `version`/`scriptKey` slipped through and blew up
 * with a Prisma non-null violation (500). These tests prove the DTO now rejects
 * those payloads at the validation layer (400) before they reach the service.
 */
describe('CreateVersionDto', () => {
  async function validatePayload(payload: Record<string, unknown>) {
    return validate(plainToInstance(CreateVersionDto, payload));
  }

  it('accepts a valid payload', async () => {
    const errors = await validatePayload({
      version: 1,
      scriptKey: 'org_1/tsk_1/aut_1.v1.js',
      changelog: 'initial publish',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing version (previously a 500)', async () => {
    const errors = await validatePayload({ scriptKey: 'k' });
    expect(errors.some((e) => e.property === 'version')).toBe(true);
  });

  it('rejects a missing scriptKey (previously a 500)', async () => {
    const errors = await validatePayload({ version: 1 });
    expect(errors.some((e) => e.property === 'scriptKey')).toBe(true);
  });

  it('rejects a version below 1', async () => {
    const errors = await validatePayload({ version: 0, scriptKey: 'k' });
    expect(errors.some((e) => e.property === 'version')).toBe(true);
  });

  it('rejects an empty scriptKey', async () => {
    const errors = await validatePayload({ version: 1, scriptKey: '' });
    expect(errors.some((e) => e.property === 'scriptKey')).toBe(true);
  });

  it('rejects a whitespace-only scriptKey (would otherwise persist a blank key)', async () => {
    for (const scriptKey of ['   ', '\t\n', '     ']) {
      const errors = await validatePayload({ version: 1, scriptKey });
      expect(errors.some((e) => e.property === 'scriptKey')).toBe(true);
    }
  });

  it('trims surrounding whitespace from a valid scriptKey', async () => {
    const dto = plainToInstance(CreateVersionDto, {
      version: 1,
      scriptKey: '  org_1/tsk_1/aut_1.v1.js  ',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.scriptKey).toBe('org_1/tsk_1/aut_1.v1.js');
  });

  it('treats changelog as optional', async () => {
    const errors = await validatePayload({ version: 2, scriptKey: 'k' });
    expect(errors.some((e) => e.property === 'changelog')).toBe(false);
  });
});
