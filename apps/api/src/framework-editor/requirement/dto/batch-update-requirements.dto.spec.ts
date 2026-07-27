import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BatchUpdateRequirementsDto } from './batch-update-requirements.dto';

/**
 * Mirrors the global ValidationPipe config from main.ts:
 *   whitelist: true, transform: true, enableImplicitConversion: true
 */
function toDto(plain: Record<string, unknown>): BatchUpdateRequirementsDto {
  return plainToInstance(BatchUpdateRequirementsDto, plain, {
    enableImplicitConversion: true,
  });
}

describe('BatchUpdateRequirementsDto', () => {
  it('accepts a valid batch payload', async () => {
    const dto = toDto({
      updates: [{ id: 'frq_1', description: 'Updated description' }],
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  // ── nested description length (FRAME-2: limit raised 10,000 → 100,000) ─
  it('accepts a nested description at the 100,000-char limit', async () => {
    const dto = toDto({
      updates: [{ id: 'frq_1', description: 'x'.repeat(100_000) }],
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a nested description longer than 100,000 chars', async () => {
    const dto = toDto({
      updates: [{ id: 'frq_1', description: 'x'.repeat(100_001) }],
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
