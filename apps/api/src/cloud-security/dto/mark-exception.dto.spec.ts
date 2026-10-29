import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  MarkExceptionDto,
  MAX_EXCEPTION_REASON_LENGTH,
} from './mark-exception.dto';

const VALID_REASON =
  'Bucket hosts intentionally public marketing assets; writes restricted to the marketing IAM role.';

/** Mirrors the global ValidationPipe. */
async function errorsFor(plain: Record<string, unknown>) {
  const dto = plainToInstance(MarkExceptionDto, plain, {
    enableImplicitConversion: true,
  });
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

const reasonErrors = async (reason: string) =>
  (await errorsFor({ reason })).map((error) => error.property);

describe('MarkExceptionDto', () => {
  describe('reason', () => {
    it('accepts a documented reason', async () => {
      expect(await reasonErrors(VALID_REASON)).toEqual([]);
    });

    it('counts non-whitespace characters, not total length', async () => {
      // 21 characters, only 11 of them non-whitespace.
      expect(await reasonErrors('a b c d e f g h i j k')).toEqual(['reason']);
      // 20 non-whitespace characters spread across padding are enough.
      expect(await reasonErrors(`  ${'a '.repeat(20)}  `)).toEqual([]);
      expect(await reasonErrors(' '.repeat(200))).toEqual(['reason']);
    });

    it(`rejects a reason longer than ${MAX_EXCEPTION_REASON_LENGTH} characters`, async () => {
      expect(
        await reasonErrors('a'.repeat(MAX_EXCEPTION_REASON_LENGTH)),
      ).toEqual([]);
      expect(
        await reasonErrors('a'.repeat(MAX_EXCEPTION_REASON_LENGTH + 1)),
      ).toEqual(['reason']);
    });
  });

  // The previous pattern, /(?:\S.*?){20}/s, nested a lazy `.*?` inside `{20}`.
  // With 19 non-whitespace characters it could never match, so it explored an
  // exponential number of paths and re-scanned the padding on each: 800 spaces
  // cost ~1.6 s and 4,000 spaces ~8 s of blocked event loop. The counting scan
  // answers in microseconds, so this threshold only trips if a backtracking
  // form comes back.
  it('rejects a whitespace-padded reason without backtracking', async () => {
    const reason = 'a'.repeat(19) + ' '.repeat(4_000);

    const start = process.hrtime.bigint();
    const errors = await errorsFor({ reason });
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

    expect(errors.map((error) => error.property)).toEqual(['reason']);
    expect(elapsedMs).toBeLessThan(100);
  });

  it('rejects an oversized reason through the global pipe with a 400', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });

    await expect(
      pipe.transform(
        { reason: 'a'.repeat(MAX_EXCEPTION_REASON_LENGTH + 1) },
        { type: 'body', metatype: MarkExceptionDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
