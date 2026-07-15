import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRequirementDto } from './update-requirement.dto';

/**
 * Mirrors the global ValidationPipe config from main.ts:
 *   whitelist: true, transform: true, enableImplicitConversion: true
 */
function toDto(plain: Record<string, unknown>): UpdateRequirementDto {
  return plainToInstance(UpdateRequirementDto, plain, {
    enableImplicitConversion: true,
  });
}

describe('UpdateRequirementDto', () => {
  it('accepts a partial update (single field)', async () => {
    const dto = toDto({ name: 'AC-2' });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  // ── description length (FRAME-2: limit raised 10,000 → 100,000) ────
  it('accepts a description at the 100,000-char limit', async () => {
    const dto = toDto({ description: 'x'.repeat(100_000) });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a description longer than 100,000 chars', async () => {
    const dto = toDto({ description: 'x'.repeat(100_001) });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('description');
  });
});
