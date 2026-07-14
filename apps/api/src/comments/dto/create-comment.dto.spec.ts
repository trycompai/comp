import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCommentDto } from './create-comment.dto';

// create-comment.dto.ts imports the `CommentEntityType` enum from `@db`,
// which eagerly instantiates the Prisma client on import — mock it so this
// spec doesn't need a configured DB connection (mirrors comments.controller.spec.ts).
jest.mock('@db', () => ({
  db: {},
  CommentEntityType: {
    task: 'task',
    vendor: 'vendor',
    risk: 'risk',
    policy: 'policy',
    finding: 'finding',
  },
}));

function tiptapDoc(content: unknown[]): string {
  return JSON.stringify({ type: 'doc', content });
}

function toDto(plain: Record<string, unknown>): CreateCommentDto {
  return plainToInstance(CreateCommentDto, plain, {
    enableImplicitConversion: true,
  });
}

const VALID_BASE = {
  entityId: 'tsk_abc123',
  entityType: 'task',
};

describe('CreateCommentDto', () => {
  it('accepts a plain-text comment under the limit', async () => {
    const dto = toDto({ ...VALID_BASE, content: 'Looks good to me' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a plain-text comment over 2000 visible characters', async () => {
    const dto = toDto({ ...VALID_BASE, content: 'x'.repeat(2001) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'content')).toBe(true);
  });

  it('accepts a formatted Tiptap comment whose raw JSON exceeds 2000 chars but whose visible text does not (regression for the reported bug)', async () => {
    const words = Array.from({ length: 240 }, (_, i) => ({
      type: 'text',
      text: 'word ',
      ...(i % 2 === 0 ? { marks: [{ type: 'bold' }] } : {}),
    }));
    const content = tiptapDoc([{ type: 'paragraph', content: words }]);
    expect(content.length).toBeGreaterThan(2000);

    const dto = toDto({ ...VALID_BASE, content });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a formatted Tiptap comment whose visible text exceeds 2000 characters', async () => {
    const content = tiptapDoc([
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'a'.repeat(2001),
            marks: [{ type: 'bold' }],
          },
        ],
      },
    ]);

    const dto = toDto({ ...VALID_BASE, content });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'content')).toBe(true);
  });

  it('rejects an empty comment', async () => {
    const dto = toDto({ ...VALID_BASE, content: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'content')).toBe(true);
  });
});
