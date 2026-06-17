import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UploadCustomFrameworkBadgeDto } from './trust-custom-framework.dto';

async function errorsFor(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(UploadCustomFrameworkBadgeDto, payload);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

const valid = {
  customFrameworkId: 'cfrm_a',
  fileName: 'badge.png',
  fileType: 'image/png',
  fileData: Buffer.from('hello').toString('base64'), // 'aGVsbG8='
};

describe('UploadCustomFrameworkBadgeDto', () => {
  it('accepts a well-formed payload', async () => {
    expect(await errorsFor(valid)).toHaveLength(0);
  });

  it('rejects malformed (non-base64) fileData', async () => {
    expect(
      await errorsFor({ ...valid, fileData: 'not valid base64 @@@' }),
    ).toContain('fileData');
  });

  it('rejects fileData over the max length (oversized payload)', async () => {
    // Valid base64 (length multiple of 4) but past the ~256KB MaxLength bound,
    // so MaxLength — not IsBase64 — is what rejects it.
    expect(
      await errorsFor({ ...valid, fileData: 'A'.repeat(350_004) }),
    ).toContain('fileData');
  });

  it('rejects empty required fields', async () => {
    const props = await errorsFor({
      customFrameworkId: '',
      fileName: '',
      fileType: '',
      fileData: '',
    });
    expect(props).toEqual(
      expect.arrayContaining([
        'customFrameworkId',
        'fileName',
        'fileType',
        'fileData',
      ]),
    );
  });
});
