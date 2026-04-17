import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IsMimeTypeField, normalizeMimeType } from './mime-type.validator';

class TestDto {
  @IsMimeTypeField()
  fileType!: string;
}

const expectValid = async (input: unknown, expectedNormalized: string) => {
  const instance = plainToInstance(TestDto, { fileType: input });
  const errors = await validate(instance);
  expect(errors).toEqual([]);
  expect(instance.fileType).toBe(expectedNormalized);
};

const expectInvalid = async (input: unknown) => {
  const instance = plainToInstance(TestDto, { fileType: input });
  const errors = await validate(instance);
  expect(errors.length).toBeGreaterThan(0);
};

describe('normalizeMimeType', () => {
  it('returns non-strings unchanged', () => {
    expect(normalizeMimeType(undefined)).toBe(undefined);
    expect(normalizeMimeType(null)).toBe(null);
    expect(normalizeMimeType(123)).toBe(123);
  });

  it('strips parameters, whitespace, and lowercases', () => {
    expect(normalizeMimeType('application/pdf')).toBe('application/pdf');
    expect(normalizeMimeType('application/pdf;charset=utf-8')).toBe(
      'application/pdf',
    );
    expect(normalizeMimeType('application/pdf; charset=utf-8')).toBe(
      'application/pdf',
    );
    expect(normalizeMimeType('  application/PDF  ')).toBe('application/pdf');
    expect(normalizeMimeType('application/pdf\n')).toBe('application/pdf');
  });
});

describe('IsMimeTypeField', () => {
  describe('valid inputs (CS-217 regression)', () => {
    it('accepts application/pdf', async () => {
      await expectValid('application/pdf', 'application/pdf');
    });

    it('accepts the xlsx vendor type', async () => {
      await expectValid(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('accepts application/pdf with charset parameter', async () => {
      await expectValid(
        'application/pdf;charset=utf-8',
        'application/pdf',
      );
    });

    it('accepts xlsx with charset parameter', async () => {
      await expectValid(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('accepts trailing whitespace', async () => {
      await expectValid('application/pdf ', 'application/pdf');
    });

    it('accepts trailing newline', async () => {
      await expectValid('application/pdf\n', 'application/pdf');
    });

    it('accepts uppercase', async () => {
      await expectValid('APPLICATION/PDF', 'application/pdf');
    });

    it('accepts structured syntax suffix (e.g. +json)', async () => {
      await expectValid(
        'application/vnd.api+json',
        'application/vnd.api+json',
      );
    });

    it('accepts image/svg+xml', async () => {
      await expectValid('image/svg+xml', 'image/svg+xml');
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', async () => {
      await expectInvalid('');
    });

    it('rejects missing slash', async () => {
      await expectInvalid('applicationpdf');
    });

    it('rejects leading slash', async () => {
      await expectInvalid('/pdf');
    });

    it('rejects trailing slash', async () => {
      await expectInvalid('application/');
    });

    it('rejects spaces inside type/subtype', async () => {
      await expectInvalid('application /pdf');
      await expectInvalid('application/ pdf');
    });

    it('rejects multiple slashes', async () => {
      await expectInvalid('application/foo/bar');
    });

    it('rejects non-string values', async () => {
      await expectInvalid(123);
      await expectInvalid(null);
      await expectInvalid(undefined);
    });
  });
});
