import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateVendorDto } from './update-vendor.dto';

/**
 * Mirrors the global ValidationPipe config from main.ts:
 *   whitelist: true, transform: true, enableImplicitConversion: true
 */
function toDto(plain: Record<string, unknown>): UpdateVendorDto {
  return plainToInstance(UpdateVendorDto, plain, {
    enableImplicitConversion: true,
  });
}

describe('UpdateVendorDto', () => {
  it('should accept a valid full update payload', async () => {
    const dto = toDto({
      name: 'Acronis',
      description: 'Backup solutions provider',
      category: 'software_as_a_service',
      status: 'assessed',
      website: 'https://www.acronis.com',
      isSubProcessor: false,
      assigneeId: 'mem_abc123',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
  });

  it('should accept a minimal update (single field)', async () => {
    const dto = toDto({ website: 'https://www.acronis.com' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
  });

  it('should accept an empty body (no fields to update)', async () => {
    const dto = toDto({});
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
  });

  // ── The bug this DTO fix addresses ────────────────────────────────
  it('should accept empty description (vendors from onboarding)', async () => {
    const dto = toDto({
      name: 'Acronis',
      description: '',
      category: 'software_as_a_service',
      status: 'assessed',
      website: 'https://www.acronis.com',
      isSubProcessor: false,
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
  });

  it('should still reject empty name', async () => {
    const dto = toDto({ name: '' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  // ── assigneeId: null (unassigned vendor) ──────────────────────────
  it('should accept assigneeId: null', async () => {
    const dto = toDto({ assigneeId: null });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
  });

  // ── website handling ──────────────────────────────────────────────
  it('should transform empty website to undefined (skip validation)', async () => {
    const dto = toDto({ website: '' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
    expect(dto.website).toBeUndefined();
  });

  it('should accept a valid website URL', async () => {
    const dto = toDto({ website: 'https://www.cloudflare.com' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
  });

  it('should reject an invalid website URL', async () => {
    const dto = toDto({ website: 'not-a-url' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('website');
  });

  // ── enum validation ───────────────────────────────────────────────
  it('should reject invalid category enum', async () => {
    const dto = toDto({ category: 'invalid_category' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('category');
  });

  it('should reject invalid status enum', async () => {
    const dto = toDto({ status: 'invalid_status' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('status');
  });

  // ── forbidNonWhitelisted ──────────────────────────────────────────
  it('should reject unknown properties', async () => {
    const dto = toDto({ name: 'Acronis', unknownField: 'value' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'unknownField')).toBe(true);
  });
});
