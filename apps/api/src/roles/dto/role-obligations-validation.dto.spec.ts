import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRoleDto } from './create-role.dto';
import { UpdateRoleDto } from './update-role.dto';

// Regression for cubic-dev-ai's review comment on RolesService: obligations
// is now validated as a real nested object (BuiltInObligationsBody, with
// `@IsBoolean()` on `compliance`) instead of an unchecked `Record<string,
// boolean>`, so malformed shapes are rejected before ever reaching
// RolesService.
//
// Note on what this DOES NOT catch: the global ValidationPipe runs with
// `transformOptions.enableImplicitConversion: true` (main.ts), and
// class-transformer's implicit conversion for a `Boolean`-typed property is
// a bare `Boolean(value)` cast — which makes any truthy value (including
// the string "false") convert to `true` *before* `@IsBoolean()` ever runs,
// so `@IsBoolean()` alone can't reject a merely-truthy non-boolean over
// HTTP. That's a pre-existing, app-wide characteristic of every
// `@IsBoolean()` field under this pipe config, not something specific to
// obligations — out of scope here. What IS specific to this invariant, and
// what actually matters for the reported bug, is the DB-read path:
// `RolesService.withCompliancePortalInvariant`'s exact `=== true` check
// (see roles.service.spec.ts) guards `obligations` read back from stored,
// unvalidated JSON (`parseObligationsField`), which never goes through
// class-transformer at all — a stored string "false" stays the literal
// string "false" there, and the exact check correctly treats it as unset.

function toDto<T extends object>(
  Dto: new () => T,
  plain: Record<string, unknown>,
): T {
  return plainToInstance(Dto, plain, { enableImplicitConversion: true });
}

describe('CreateRoleDto obligations validation', () => {
  const base = { name: 'Compliance Lead', permissions: { control: ['read'] } };

  it('accepts a boolean compliance value', async () => {
    const dto = toDto(CreateRoleDto, {
      ...base,
      obligations: { compliance: true },
    });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'obligations')).toHaveLength(0);
  });

  it('accepts omitted obligations', async () => {
    const dto = toDto(CreateRoleDto, base);
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'obligations')).toHaveLength(0);
  });

  it('rejects a non-object obligations value', async () => {
    const dto = toDto(CreateRoleDto, { ...base, obligations: 'not-an-object' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'obligations')).toBe(true);
  });
});

describe('UpdateRoleDto obligations validation', () => {
  it('accepts a boolean compliance value', async () => {
    const dto = toDto(UpdateRoleDto, { obligations: { compliance: false } });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'obligations')).toHaveLength(0);
  });

  it('rejects a non-object obligations value', async () => {
    const dto = toDto(UpdateRoleDto, { obligations: 'not-an-object' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'obligations')).toBe(true);
  });
});
