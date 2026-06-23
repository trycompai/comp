import { db } from '@db';
import { generateObject } from 'ai';
import { processPolicyUpdate } from './update-policy-helpers';

jest.mock('@db', () => ({
  db: {
    organization: { findUnique: jest.fn() },
    policy: { findUnique: jest.fn(), update: jest.fn() },
    frameworkEditorPolicyTemplate: { findUnique: jest.fn() },
    policyVersion: { create: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('ai', () => ({
  generateObject: jest.fn(),
  NoObjectGeneratedError: { isInstance: jest.fn(() => false) },
}));

jest.mock('@ai-sdk/openai', () => ({ openai: jest.fn(() => 'openai-model') }));
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => 'anthropic-model'),
}));

// A real TipTap template carrying an org-specific handlebars placeholder. The
// deterministic template processor must substitute {{COMPANY}} with the org
// name; the legacy gpt-5-mini generator never would (it ignores the template).
const TEMPLATE_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Information Security Policy' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'This policy applies to all employees of {{COMPANY}}.',
        },
      ],
    },
  ],
};

describe('processPolicyUpdate (individual policy regeneration)', () => {
  let storedContent: unknown[] | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    storedContent = undefined;

    (db.organization.findUnique as jest.Mock).mockResolvedValue({
      id: 'org_1',
      name: 'Acme Inc',
      website: 'https://acme.example',
    });
    (db.policy.findUnique as jest.Mock).mockResolvedValue({
      id: 'pol_1',
      organizationId: 'org_1',
      policyTemplateId: 'tmpl_1',
      versions: [],
    });
    (
      db.frameworkEditorPolicyTemplate.findUnique as jest.Mock
    ).mockResolvedValue({
      id: 'tmpl_1',
      name: 'Information Security Policy',
      content: TEMPLATE_CONTENT,
    });
    (db.$transaction as jest.Mock).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          policy: { update: jest.fn() },
          policyVersion: {
            create: jest.fn(({ data }: { data: { content: unknown[] } }) => {
              storedContent = data.content;
              return { id: 'pv_1' };
            }),
            deleteMany: jest.fn(),
          },
        }),
    );

    // If the legacy gpt-5-mini path runs, it returns generic, template-ignoring
    // content (no org-specific values) — exactly the reported bug.
    (generateObject as jest.Mock).mockResolvedValue({
      object: {
        type: 'document',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Generic boilerplate policy content.' },
            ],
          },
        ],
      },
    });
  });

  it('fills org-specific placeholders deterministically without the legacy full-document LLM generator', async () => {
    const result = await processPolicyUpdate({
      organizationId: 'org_1',
      policyId: 'pol_1',
      contextHub: '',
      frameworks: [],
    });

    const serialized = JSON.stringify(storedContent);

    // Deterministic processTemplate substitutes {{COMPANY}} with the org name.
    expect(serialized).toContain('Acme Inc');
    expect(serialized).not.toContain('{{COMPANY}}');

    // The slow, generic gpt-5-mini full-document generator must not run for a
    // template that has no instruction cue lines to refine.
    expect(generateObject).not.toHaveBeenCalled();
    expect(serialized).not.toContain('Generic boilerplate policy content.');

    expect(result.policyName).toBe('Information Security Policy');
  });
});
