// Mock @db so importing the DTO (which pulls enums from @db) doesn't spin up a
// real Prisma client. The mocked enums are what @IsEnum validates against, so
// the payloads below use these values.
jest.mock('@db', () => ({
  Frequency: { monthly: 'monthly', yearly: 'yearly' },
  Departments: { it: 'it', admin: 'admin' },
  EvidenceFormType: { policy: 'policy' },
  TaskAutomationStatus: { manual: 'manual' },
}));

import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { Departments, Frequency } from '@db';
import { ImportFrameworkDto } from './import-framework.dto';

function collectMessages(errors: ValidationError[]): string[] {
  const out: string[] = [];
  for (const e of errors) {
    if (e.constraints) out.push(...Object.values(e.constraints));
    if (e.children?.length) out.push(...collectMessages(e.children));
  }
  return out;
}

const FREQUENCY = Object.values(Frequency)[0] as Frequency;
const DEPARTMENT = Object.values(Departments)[0] as Departments;

function basePayload(
  overrides: { requirementDescription?: string; policyContent?: unknown } = {},
) {
  return {
    version: '1',
    framework: { name: 'NIST SP800-53', version: '5', description: 'Low impact', visible: false },
    requirements: [
      {
        name: 'System Security and Privacy Plans',
        identifier: 'PL-2',
        description: overrides.requirementDescription ?? 'Develop security and privacy plans.',
        requirementFamily: 'PL - Planning',
      },
    ],
    policyTemplates: [
      {
        name: 'Access Control Policy',
        description: 'Policy',
        frequency: FREQUENCY,
        department: DEPARTMENT,
        content:
          'policyContent' in overrides ? overrides.policyContent : { type: 'doc', content: [] },
      },
    ],
    controlTemplates: [],
    taskTemplates: [],
  };
}

async function validatePayload(plain: Record<string, unknown>) {
  const dto = plainToInstance(ImportFrameworkDto, plain, { enableImplicitConversion: true });
  return collectMessages(await validate(dto, { whitelist: true }));
}

describe('ImportFrameworkDto', () => {
  it('accepts a valid payload', async () => {
    expect(await validatePayload(basePayload())).toHaveLength(0);
  });

  // Bug A — the import path must allow the same 100,000-char requirement
  // descriptions the standalone requirement editor allows (FRAME-2: NIST PL-2
  // > 6000, HITRUST CSF requirements exceed 70,000).
  it('accepts a 100,000-char requirement description', async () => {
    expect(
      await validatePayload(basePayload({ requirementDescription: 'x'.repeat(100_000) })),
    ).toHaveLength(0);
  });

  it('rejects a requirement description longer than 100,000 chars', async () => {
    const messages = await validatePayload(
      basePayload({ requirementDescription: 'x'.repeat(100_001) }),
    );
    expect(messages.some((m) => m.includes('100000'))).toBe(true);
  });

  // FRAME-2 raised requirement descriptions to 100,000, but control / policy /
  // task template descriptions keep their existing 10,000 cap — the ticket is
  // requirements-only, so this divergence is deliberate.
  it('accepts 10,000-char control / policy / task descriptions', async () => {
    const long = 'x'.repeat(10_000);
    const payload = {
      ...basePayload(),
      controlTemplates: [{ name: 'C', description: long, controlFamily: 'AC' }],
      policyTemplates: [
        {
          name: 'P',
          description: long,
          frequency: FREQUENCY,
          department: DEPARTMENT,
          content: { type: 'doc', content: [] },
        },
      ],
      taskTemplates: [{ name: 'T', description: long, frequency: FREQUENCY, department: DEPARTMENT }],
    };
    expect(await validatePayload(payload)).toHaveLength(0);
  });

  // Bug B — policy content may be a doc object OR a bare node array.
  it('accepts policy content as a bare node array', async () => {
    expect(
      await validatePayload(basePayload({ policyContent: [{ type: 'paragraph', content: [] }] })),
    ).toHaveLength(0);
  });

  it('accepts policy content as a doc object', async () => {
    expect(
      await validatePayload(
        basePayload({ policyContent: { type: 'doc', content: [{ type: 'paragraph' }] } }),
      ),
    ).toHaveLength(0);
  });

  it('rejects policy content that is a primitive', async () => {
    const messages = await validatePayload(basePayload({ policyContent: 'not-json' }));
    expect(messages.some((m) => m.toLowerCase().includes('object or an array'))).toBe(true);
  });

  it('still rejects oversized policy content (size guard kept)', async () => {
    const huge = [{ type: 'text', text: 'x'.repeat(520_000) }];
    const messages = await validatePayload(basePayload({ policyContent: huge }));
    expect(messages.some((m) => m.toLowerCase().includes('maximum allowed size'))).toBe(true);
  });
});
