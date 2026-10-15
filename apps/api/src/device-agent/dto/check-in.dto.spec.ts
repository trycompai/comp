import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CheckInDto } from './check-in.dto';

/**
 * Mirrors the global ValidationPipe config from main.ts:
 *   whitelist: true, forbidNonWhitelisted: true, transform: true,
 *   enableImplicitConversion: true
 */
async function validateCheckIn(plain: Record<string, unknown>) {
  const dto = plainToInstance(CheckInDto, plain, {
    enableImplicitConversion: true,
  });
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('CheckInDto', () => {
  it('accepts a check-in without osVersion (agents that predate the field)', async () => {
    const errors = await validateCheckIn({ deviceId: 'dev_1', checks: [] });
    expect(errors).toHaveLength(0);
  });

  it('accepts a check-in carrying osVersion', async () => {
    const errors = await validateCheckIn({
      deviceId: 'dev_1',
      checks: [],
      osVersion: '15.8.1',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty osVersion', async () => {
    const errors = await validateCheckIn({
      deviceId: 'dev_1',
      checks: [],
      osVersion: '',
    });
    expect(errors.map((e) => e.property)).toContain('osVersion');
  });

  it('rejects an osVersion longer than 100 chars', async () => {
    const errors = await validateCheckIn({
      deviceId: 'dev_1',
      checks: [],
      osVersion: 'x'.repeat(101),
    });
    expect(errors.map((e) => e.property)).toContain('osVersion');
  });
});
