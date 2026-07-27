import { ValidationPipe } from '@nestjs/common';
import { CreatePolicyDto } from './create-policy.dto';
import { UpdatePolicyDto } from './update-policy.dto';

/**
 * Regression test for the MCP/public-API policy content serialization bug.
 *
 * The global ValidationPipe in main.ts runs with `transform: true` and
 * `transformOptions: { enableImplicitConversion: true }`. class-transformer
 * then coerces each TipTap node object toward the reflected `Array` design-type
 * of `content: unknown[]`, turning `[{...}, {...}]` into `[[], []]` — silently
 * blanking the policy body on create/update. These tests exercise the exact
 * pipe configuration and assert the structured content survives intact.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const TIPTAP_NODES = [
  {
    type: 'heading',
    attrs: { level: 2, textAlign: null },
    content: [{ type: 'text', text: 'Purpose' }],
  },
  {
    type: 'paragraph',
    attrs: { textAlign: null },
    content: [
      {
        type: 'text',
        text: 'Verify workforce integrity and grant the right access.',
        marks: [{ type: 'bold' }],
      },
    ],
  },
];

describe('Policy DTO content serialization (ValidationPipe)', () => {
  it('preserves structured TipTap content on CreatePolicyDto', async () => {
    const result = await pipe.transform(
      { name: 'Access Control Policy', content: TIPTAP_NODES },
      { type: 'body', metatype: CreatePolicyDto },
    );

    expect(result.content).toEqual(TIPTAP_NODES);
    // Guard against the exact regression: nodes must not collapse to `[]`.
    expect(result.content[0]).toMatchObject({ type: 'heading' });
    expect(result.content).not.toEqual([[], []]);
  });

  it('preserves structured TipTap content on UpdatePolicyDto', async () => {
    const result = await pipe.transform(
      { content: TIPTAP_NODES },
      { type: 'body', metatype: UpdatePolicyDto },
    );

    expect(result.content).toEqual(TIPTAP_NODES);
    expect(result.content[1]).toMatchObject({ type: 'paragraph' });
    expect(result.content).not.toEqual([[], []]);
  });

  it('leaves content untouched when omitted on update', async () => {
    const result = await pipe.transform(
      { name: 'Renamed only' },
      { type: 'body', metatype: UpdatePolicyDto },
    );

    expect(result.content).toBeUndefined();
  });
});
