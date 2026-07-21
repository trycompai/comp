import { db } from '@db';
import { generateObject } from 'ai';
import {
  processPolicyUpdate,
  updatePolicyInDatabase,
} from './update-policy-helpers';

jest.mock('@db', () => ({
  db: {
    organization: { findUnique: jest.fn() },
    policy: { findUnique: jest.fn(), update: jest.fn() },
    frameworkEditorPolicyTemplate: { findUnique: jest.fn() },
    policyVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError {},
  },
  PolicyStatus: {
    draft: 'draft',
    published: 'published',
    needs_review: 'needs_review',
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
            findFirst: jest.fn().mockResolvedValue(null),
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

// CS-766: Regenerating a PUBLISHED, signed policy must not touch the live
// version. It must append a new DRAFT version (for the approval workflow) while
// leaving policy.content, currentVersionId, signedBy, pdfUrl and the existing
// versions intact. Only publishing that draft (elsewhere) clears signedBy and
// re-triggers signing.
describe('updatePolicyInDatabase (published policy regeneration)', () => {
  const REGEN_CONTENT = [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Regenerated draft content' }],
    },
  ];

  let txPolicyUpdate: jest.Mock;
  let txVersionCreate: jest.Mock;
  let txVersionDeleteMany: jest.Mock;
  let txVersionFindFirst: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // A published policy: v1 is the current, signed, live version.
    (db.policy.findUnique as jest.Mock).mockResolvedValue({
      id: 'pol_1',
      status: 'published',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Published v1' }] },
      ],
      currentVersionId: 'pv_1',
      signedBy: ['mem_a', 'mem_b'],
      pdfUrl: 'org_1/policies/pol_1/v1.pdf',
      versions: [{ id: 'pv_1', pdfUrl: null, version: 1 }],
    });

    txPolicyUpdate = jest.fn();
    txVersionCreate = jest.fn(() => ({ id: 'pv_2' }));
    txVersionDeleteMany = jest.fn();
    txVersionFindFirst = jest.fn().mockResolvedValue({ version: 1 });

    (db.$transaction as jest.Mock).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          policy: { update: txPolicyUpdate },
          policyVersion: {
            findFirst: txVersionFindFirst,
            create: txVersionCreate,
            deleteMany: txVersionDeleteMany,
          },
        }),
    );
  });

  it('appends a new draft version and preserves the published version + signatures', async () => {
    await updatePolicyInDatabase('pol_1', REGEN_CONTENT, 'mem_regen');

    // Existing versions (and their PDFs) must survive — the published version
    // must not be destroyed.
    expect(txVersionDeleteMany).not.toHaveBeenCalled();

    // A brand-new version is appended at the next number (not overwriting v1).
    expect(txVersionCreate).toHaveBeenCalledTimes(1);
    const createData = txVersionCreate.mock.calls[0][0].data;
    expect(createData.version).toBe(2);
    expect(createData.changelog).toBe('Regenerated policy content');
    expect(JSON.stringify(createData.content)).toContain(
      'Regenerated draft content',
    );

    // The published policy row must NOT be mutated: no signature wipe, no live
    // content swap, no currentVersion repoint.
    const policyUpdateData = txPolicyUpdate.mock.calls.map(
      (call) => (call[0] as { data?: Record<string, unknown> })?.data ?? {},
    );
    for (const data of policyUpdateData) {
      expect(data).not.toHaveProperty('signedBy');
      expect(data).not.toHaveProperty('content');
      expect(data).not.toHaveProperty('currentVersionId');
    }
  });
});

// CS-766 follow-up: Regenerating a DRAFT policy (never published, unsigned) must
// SURFACE the regenerated content. The editor renders the current version's
// content (falling back to policy.content), so regeneration overwrites the
// current draft version IN PLACE and syncs policy.content/draftContent — it must
// NOT append an unattached version that leaves the draft showing stale text.
describe('updatePolicyInDatabase (draft policy regeneration)', () => {
  const REGEN_CONTENT = [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Regenerated draft content' }],
    },
  ];

  let txPolicyUpdate: jest.Mock;
  let txVersionUpdate: jest.Mock;
  let txVersionCreate: jest.Mock;
  let txVersionDeleteMany: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // A draft policy: v1 is the current, unpublished, unsigned working version.
    (db.policy.findUnique as jest.Mock).mockResolvedValue({
      id: 'pol_1',
      status: 'draft',
      currentVersionId: 'pv_1',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Stale draft' }] },
      ],
      signedBy: [],
      versions: [{ id: 'pv_1', pdfUrl: null, version: 1 }],
    });

    txPolicyUpdate = jest.fn();
    txVersionUpdate = jest.fn();
    txVersionCreate = jest.fn(() => ({ id: 'pv_2' }));
    txVersionDeleteMany = jest.fn();

    (db.$transaction as jest.Mock).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          policy: { update: txPolicyUpdate },
          policyVersion: {
            update: txVersionUpdate,
            create: txVersionCreate,
            deleteMany: txVersionDeleteMany,
            findFirst: jest.fn().mockResolvedValue({ version: 1 }),
          },
        }),
    );
  });

  it('overwrites the current draft version in place and syncs policy content (no unattached version)', async () => {
    await updatePolicyInDatabase('pol_1', REGEN_CONTENT, 'mem_regen');

    // The regenerated content overwrites the CURRENT draft version in place so
    // the editor (which reads currentVersion.content) surfaces it.
    expect(txVersionUpdate).toHaveBeenCalledTimes(1);
    const versionUpdate = txVersionUpdate.mock.calls[0][0];
    expect(versionUpdate.where.id).toBe('pv_1');
    expect(JSON.stringify(versionUpdate.data.content)).toContain(
      'Regenerated draft content',
    );

    // No unattached extra version is appended (and nothing is deleted) for a
    // draft — the working version is edited in place.
    expect(txVersionCreate).not.toHaveBeenCalled();
    expect(txVersionDeleteMany).not.toHaveBeenCalled();

    // policy.content AND draftContent advance to the regenerated content so the
    // draft no longer shows stale text; currentVersionId is not repointed.
    expect(txPolicyUpdate).toHaveBeenCalledTimes(1);
    const policyUpdate = txPolicyUpdate.mock.calls[0][0].data;
    expect(JSON.stringify(policyUpdate.content)).toContain(
      'Regenerated draft content',
    );
    expect(JSON.stringify(policyUpdate.draftContent)).toContain(
      'Regenerated draft content',
    );
    expect(policyUpdate).not.toHaveProperty('currentVersionId');
  });
});
