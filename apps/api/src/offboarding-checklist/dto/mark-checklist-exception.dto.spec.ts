import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MarkChecklistExceptionDto } from './mark-checklist-exception.dto';

describe('MarkChecklistExceptionDto', () => {
  it('accepts a non-empty reason', async () => {
    const dto = plainToInstance(MarkChecklistExceptionDto, {
      reason: 'No company device was ever issued',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a missing reason', async () => {
    const dto = plainToInstance(MarkChecklistExceptionDto, {});
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('rejects a whitespace-only reason', async () => {
    const dto = plainToInstance(MarkChecklistExceptionDto, { reason: '   ' });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
