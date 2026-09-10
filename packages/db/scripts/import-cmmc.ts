/**
 * One-off: import the CMMC Level 2 framework definition.
 *
 * Mirrors FrameworkExportService.import() in
 * apps/api/src/framework-editor/framework/framework-export.service.ts —
 * same entities, same link rows, same single transaction. Used instead of
 * POST /v1/framework-editor/framework/import because that route is behind
 * PlatformAdminGuard, which requires a browser session cookie.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'node:fs';

const payloadPath = process.argv[2];
if (!payloadPath) throw new Error('usage: bun import-cmmc.ts <payload.json>');

const dto = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function normalizeTipTapDoc(content: unknown): Record<string, unknown> {
  if (Array.isArray(content)) return { type: 'doc', content };
  if (content !== null && typeof content === 'object') {
    const node = content as { type?: unknown; content?: unknown };
    if (node.type === 'doc') {
      return { type: 'doc', content: Array.isArray(node.content) ? node.content : [] };
    }
    if (typeof node.type === 'string') return { type: 'doc', content: [content] };
  }
  return { type: 'doc', content: [] };
}

// Same index validation the API performs before writing anything.
function validateIndices() {
  const reqCount = dto.requirements?.length ?? 0;
  const polCount = dto.policyTemplates?.length ?? 0;
  const taskCount = dto.taskTemplates?.length ?? 0;
  for (const ct of dto.controlTemplates ?? []) {
    for (const i of ct.requirementIndices ?? [])
      if (i < 0 || i >= reqCount) throw new Error(`"${ct.name}" bad requirement index ${i}`);
    for (const i of ct.policyTemplateIndices ?? [])
      if (i < 0 || i >= polCount) throw new Error(`"${ct.name}" bad policy index ${i}`);
    for (const i of ct.taskTemplateIndices ?? [])
      if (i < 0 || i >= taskCount) throw new Error(`"${ct.name}" bad task index ${i}`);
  }
}

async function main() {
  validateIndices();

  const existing = await prisma.frameworkEditorFramework.findFirst({
    where: { name: dto.framework.name },
  });
  if (existing) {
    console.error(`Framework "${dto.framework.name}" already exists (${existing.id}). Aborting.`);
    process.exit(1);
  }

  const framework = await prisma.$transaction(
    async (tx) => {
      const fw = await tx.frameworkEditorFramework.create({
        data: {
          name: dto.framework.name,
          version: dto.framework.version,
          description: dto.framework.description,
          visible: dto.framework.visible ?? false,
        },
      });

      // Sequential so array index order is guaranteed to match the payload.
      const reqs = [];
      for (const r of dto.requirements ?? []) {
        reqs.push(
          await tx.frameworkEditorRequirement.create({
            data: {
              frameworkId: fw.id,
              name: r.name,
              identifier: r.identifier ?? '',
              description: r.description,
              requirementFamily: r.requirementFamily || null,
              sortOrder: r.sortOrder ?? null,
            },
          }),
        );
      }

      const pols = [];
      for (const p of dto.policyTemplates ?? []) {
        pols.push(
          await tx.frameworkEditorPolicyTemplate.create({
            data: {
              name: p.name,
              description: p.description,
              frequency: p.frequency,
              department: p.department,
              content: normalizeTipTapDoc(p.content),
            },
          }),
        );
      }

      const tsks = [];
      for (const t of dto.taskTemplates ?? []) {
        tsks.push(
          await tx.frameworkEditorTaskTemplate.create({
            data: {
              name: t.name,
              description: t.description,
              frequency: t.frequency,
              department: t.department,
              automationStatus: t.automationStatus,
            },
          }),
        );
      }

      const ctrls = [];
      for (const ct of dto.controlTemplates ?? []) {
        ctrls.push(
          await tx.frameworkEditorControlTemplate.create({
            data: {
              name: ct.name,
              description: ct.description,
              controlFamily: ct.controlFamily ?? null,
              requirements: {
                connect: (ct.requirementIndices ?? []).map((i: number) => ({ id: reqs[i].id })),
              },
            },
          }),
        );
      }

      const policyLinks = (dto.controlTemplates ?? []).flatMap((ct: any, ci: number) =>
        (ct.policyTemplateIndices ?? []).map((pi: number) => ({
          frameworkId: fw.id,
          controlTemplateId: ctrls[ci].id,
          policyTemplateId: pols[pi].id,
        })),
      );
      const taskLinks = (dto.controlTemplates ?? []).flatMap((ct: any, ci: number) =>
        (ct.taskTemplateIndices ?? []).map((ti: number) => ({
          frameworkId: fw.id,
          controlTemplateId: ctrls[ci].id,
          taskTemplateId: tsks[ti].id,
        })),
      );

      if (policyLinks.length)
        await tx.frameworkEditorControlPolicyTemplateLink.createMany({
          data: policyLinks,
          skipDuplicates: true,
        });
      if (taskLinks.length)
        await tx.frameworkEditorControlTaskTemplateLink.createMany({
          data: taskLinks,
          skipDuplicates: true,
        });

      console.log(
        `Imported "${fw.name}" (${fw.id}): ${reqs.length} requirements, ` +
          `${ctrls.length} controls, ${pols.length} policies, ${tsks.length} tasks, ` +
          `${policyLinks.length} policy links, ${taskLinks.length} task links`,
      );
      return fw;
    },
    { maxWait: 30_000, timeout: 300_000 },
  );

  console.log('framework id:', framework.id);
}

main()
  .catch((e) => {
    console.error('IMPORT FAILED:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
