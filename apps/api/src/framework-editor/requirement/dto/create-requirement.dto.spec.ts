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

  // ── description length (FRAME-2: limit raised 10,000 → 100,000) ────
  it('accepts a description at the 100,000-char limit', async () => {
    const dto = toDto({ ...VALID_BASE, description: 'x'.repeat(100_000) });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a description longer than 100,000 chars', async () => {
    const dto = toDto({ ...VALID_BASE, description: 'x'.repeat(100_001) });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('description');
  });

  // ── sortOrder (FRAME-18) ───────────────────────────────────────────
  it('accepts a non-negative integer sortOrder', async () => {
    const dto = toDto({ ...VALID_BASE, sortOrder: 10 });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
  });

  it('accepts a payload with no sortOrder', async () => {
    const dto = toDto(VALID_BASE);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((e) => e.property === 'sortOrder')).toBe(false);
  });

  it('rejects a negative sortOrder', async () => {
    const dto = toDto({ ...VALID_BASE, sortOrder: -1 });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((e) => e.property === 'sortOrder')).toBe(true);
  });

  it('rejects a non-integer sortOrder', async () => {
    const dto = toDto({ ...VALID_BASE, sortOrder: 1.5 });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((e) => e.property === 'sortOrder')).toBe(true);
  });
});
