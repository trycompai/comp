import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRequirementDto } from './create-requirement.dto';

/**
 * Mirrors the global ValidationPipe config from main.ts:
 *   whitelist: true, transform: true, enableImplicitConversion: true
 */
function toDto(plain: Record<string, unknown>): CreateRequirementDto {
  return plainToInstance(CreateRequirementDto, plain, {
    enableImplicitConversion: true,
  });
}

const VALID_BASE = {
  frameworkId: 'frk_abc123',
  name: 'AC-1',
  description: 'Access control policy and procedures',
};

describe('CreateRequirementDto', () => {
  it('accepts a valid payload', async () => {
    const dto = toDto(VALID_BASE);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  // ── description length (FRAME-2: limit raised 5,000 → 10,000) ──────
  it('accepts a description at the 10,000-char limit', async () => {
    const dto = toDto({ ...VALID_BASE, description: 'x'.repeat(10_000) });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a description longer than 10,000 chars', async () => {
    const dto = toDto({ ...VALID_BASE, description: 'x'.repeat(10_001) });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('description');
  });
});
