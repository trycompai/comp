import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { UpdateCustomFrameworkDto } from './update-custom-framework.dto';

function propsWithErrors(errors: ValidationError[]): string[] {
  return errors.map((e) => e.property);
}

async function validatePayload(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdateCustomFrameworkDto, payload);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('UpdateCustomFrameworkDto', () => {
  it('accepts a name-only payload', async () => {
    expect(await validatePayload({ name: 'Internal Controls' })).toHaveLength(0);
  });

  it('accepts a description-only payload', async () => {
    expect(await validatePayload({ description: 'Covers X' })).toHaveLength(0);
  });

  it('accepts an empty payload (field-level; empty PATCH is rejected in the service)', async () => {
    expect(await validatePayload({})).toHaveLength(0);
  });

  it('rejects an explicit null name', async () => {
    const errors = await validatePayload({ name: null });
    expect(propsWithErrors(errors)).toContain('name');
  });

  it('rejects an explicit null description', async () => {
    const errors = await validatePayload({ description: null });
    expect(propsWithErrors(errors)).toContain('description');
  });

  it('rejects a non-string name', async () => {
    const errors = await validatePayload({ name: 42 });
    expect(propsWithErrors(errors)).toContain('name');
  });

  it('rejects an empty-string name (MinLength)', async () => {
    const errors = await validatePayload({ name: '' });
    expect(propsWithErrors(errors)).toContain('name');
  });
});
