// Importing a DTO that re-exports from '@db' would otherwise boot the Prisma
// client; mock it down to just the enum the DTO needs.
jest.mock('@db', () => ({
  FrameworkEditorFrameworkFamilyStatus: {
    visible: 'visible',
    hidden: 'hidden',
    under_construction: 'under_construction',
    partial: 'partial',
  },
}));

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateFrameworkFamilyDto } from './update-framework-family.dto';

function toDto(plain: Record<string, unknown>): UpdateFrameworkFamilyDto {
  return plainToInstance(UpdateFrameworkFamilyDto, plain, {
    enableImplicitConversion: true,
  });
}

describe('UpdateFrameworkFamilyDto', () => {
  it('accepts an empty payload (every field is optional)', async () => {
    const errors = await validate(toDto({}), { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
  });

  it('accepts a partial valid update', async () => {
    const errors = await validate(toDto({ name: 'NIST', status: 'partial' }), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  // Regression: null must be rejected, not silently passed to a non-nullable column.
  it('rejects null name', async () => {
    const errors = await validate(toDto({ name: null }), { whitelist: true });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects null status', async () => {
    const errors = await validate(toDto({ status: null }), { whitelist: true });
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('rejects an empty-string name', async () => {
    const errors = await validate(toDto({ name: '' }), { whitelist: true });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects an invalid status value', async () => {
    const errors = await validate(toDto({ status: 'bogus' }), { whitelist: true });
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });
});
