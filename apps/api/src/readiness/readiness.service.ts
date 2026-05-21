import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  db,
  Departments,
  EvidenceFormType,
  Impact,
  Likelihood,
  PolicyStatus,
  Prisma,
  RiskCategory,
  RiskStatus,
  RiskTreatmentType,
  TaskAutomationStatus,
  TaskFrequency,
  TaskStatus,
  VendorCategory,
  VendorStatus,
} from '@db';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ApiKeyService } from '../auth/api-key.service';

const registerSchema = z.object({
  companyName: z.string().trim().min(2),
  ownerEmail: z.string().trim().email(),
  ownerName: z.string().trim().min(1).default('Comp AI Agent'),
  website: z.string().trim().url().optional(),
  framework: z.string().trim().min(1).default('SOC 2 Type 1'),
});

const vendorSchema = z.object({
  name: z.string().trim().min(1),
  website: z.string().trim().url().optional(),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  isSubProcessor: z.boolean().optional(),
});

const riskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

const applySchema = z.object({
  targetCompletion: z.number().min(0).max(1).default(0.9),
  repoContext: z.record(z.string(), z.unknown()).optional(),
  vendors: z.array(vendorSchema).default([]),
  risks: z.array(riskSchema).default([]),
  markOnboardingComplete: z.boolean().default(true),
});

type RegisterInput = z.infer<typeof registerSchema>;
type ApplyInput = z.infer<typeof applySchema>;
type VendorInput = z.infer<typeof vendorSchema>;
type RiskInput = z.infer<typeof riskSchema>;

const READINESS_FRAMEWORK_NAME = 'SOC 2 Type 1 Readiness';

const READINESS_REQUIREMENTS = [
  {
    identifier: 'CC1',
    name: 'Control Environment',
    description: 'Policies, accountability, and governance are established.',
    control: 'Governance and accountability controls',
    policy: 'Information Security Policy',
    tasks: [
      'Approve information security policy',
      'Assign security ownership and reporting lines',
    ],
    evidenceFormType: EvidenceFormType.board_meeting,
  },
  {
    identifier: 'CC2',
    name: 'Communication and Information',
    description: 'Security responsibilities and evidence are communicated.',
    control: 'Security communication controls',
    policy: 'Acceptable Use Policy',
    tasks: [
      'Publish acceptable use requirements',
      'Record security leadership meeting minutes',
    ],
    evidenceFormType: EvidenceFormType.it_leadership_meeting,
  },
  {
    identifier: 'CC3',
    name: 'Risk Assessment',
    description: 'Risk assessment is performed and tracked.',
    control: 'Risk assessment controls',
    policy: 'Risk Management Policy',
    tasks: ['Maintain risk register', 'Review risk treatment decisions'],
    evidenceFormType: EvidenceFormType.risk_committee_meeting,
  },
  {
    identifier: 'CC4',
    name: 'Monitoring Activities',
    description: 'Control monitoring and review cadence are operating.',
    control: 'Monitoring and review controls',
    policy: 'Monitoring Policy',
    tasks: ['Review control monitoring results', 'Document follow-up actions'],
    evidenceFormType: EvidenceFormType.meeting,
  },
  {
    identifier: 'CC5',
    name: 'Control Activities',
    description: 'Access, change, and operational controls are defined.',
    control: 'Operational control activities',
    policy: 'Change Management Policy',
    tasks: ['Document change approval workflow', 'Review production access'],
    evidenceFormType: EvidenceFormType.access_request,
  },
  {
    identifier: 'CC6',
    name: 'Logical and Physical Access',
    description: 'Access is authorized, reviewed, and removed timely.',
    control: 'Access control safeguards',
    policy: 'Access Control Policy',
    tasks: ['Complete RBAC matrix review', 'Review privileged access'],
    evidenceFormType: EvidenceFormType.rbac_matrix,
  },
  {
    identifier: 'CC7',
    name: 'System Operations',
    description: 'Operations, detection, and incident response are tracked.',
    control: 'System operations controls',
    policy: 'Incident Response Policy',
    tasks: [
      'Run incident response tabletop exercise',
      'Review security monitoring alerts',
    ],
    evidenceFormType: EvidenceFormType.tabletop_exercise,
  },
  {
    identifier: 'CC8',
    name: 'Change Management',
    description: 'System changes are tested, reviewed, and deployed safely.',
    control: 'Secure SDLC controls',
    policy: 'Secure Software Development Policy',
    tasks: ['Review GitHub branch protection', 'Document release approvals'],
    evidenceFormType: EvidenceFormType.infrastructure_inventory,
  },
  {
    identifier: 'CC9',
    name: 'Risk Mitigation',
    description: 'Third-party and operational risks are mitigated.',
    control: 'Vendor and risk mitigation controls',
    policy: 'Vendor Management Policy',
    tasks: ['Assess critical vendors', 'Review vendor risk mitigations'],
    evidenceFormType: EvidenceFormType.network_diagram,
  },
  {
    identifier: 'A1',
    name: 'Availability',
    description: 'Availability commitments and recovery practices are tracked.',
    control: 'Availability and continuity controls',
    policy: 'Business Continuity Policy',
    tasks: [
      'Document backup and recovery inventory',
      'Review cloud availability posture',
    ],
    evidenceFormType: EvidenceFormType.infrastructure_inventory,
  },
] as const;

const BASELINE_VENDORS: VendorInput[] = [
  {
    name: 'Amazon Web Services',
    website: 'https://aws.amazon.com',
    category: 'cloud',
    description: 'Cloud infrastructure hosting, networking, monitoring, and storage.',
    isSubProcessor: true,
  },
  {
    name: 'GitHub',
    website: 'https://github.com',
    category: 'software_as_a_service',
    description: 'Source control, code review, and CI/CD workflow provider.',
    isSubProcessor: true,
  },
];

const BASELINE_RISKS: RiskInput[] = [
  {
    title: 'Unauthorized cloud access',
    category: 'technology',
    description:
      'Cloud IAM misconfiguration could allow unauthorized access to production infrastructure.',
  },
  {
    title: 'Vendor concentration and third-party dependency',
    category: 'vendor_management',
    description:
      'Critical customer-facing services depend on third-party cloud and SaaS providers.',
  },
  {
    title: 'Incomplete security evidence before Type 1 audit',
    category: 'governance',
    description:
      'Readiness evidence may be incomplete or stale without an explicit owner and cadence.',
  },
];

@Injectable()
export class ReadinessService {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async register(bootstrapToken: string | undefined, rawBody: unknown) {
    this.assertBootstrapToken(bootstrapToken);
    const input = registerSchema.parse(rawBody);

    const { user, organization, member, created } =
      await this.upsertOrganization(input);

    await this.ensureReadinessStructure({
      organizationId: organization.id,
      ownerMemberId: member.id,
      targetCompletion: 0,
    });

    const apiKey = await this.apiKeyService.create(
      organization.id,
      `compctl-${new Date().toISOString()}`,
      'never',
      this.apiKeyService.getAvailableScopes(),
    );

    return {
      success: true,
      data: {
        organizationId: organization.id,
        organizationName: organization.name,
        ownerUserId: user.id,
        ownerMemberId: member.id,
        created,
        apiKey: apiKey.key,
        apiUrl: this.getApiUrl(),
        appUrl: this.getAppUrl(organization.id),
        aws: {
          externalId: organization.id,
          roleAssumerArn: this.getRoleAssumerArn(),
        },
        nextCommands: [
          'compctl aws setup-role --profile crypto --external-id <organizationId> --principal-arn <roleAssumerArn>',
          'compctl aws connect --role-arn <roleArn> --regions eu-central-1',
          'compctl aws scan',
          'compctl readiness apply --repo /Users/mehul/Desktop/projects/helvetia',
          'compctl readiness status',
        ],
      },
    };
  }

  async applyReadiness(organizationId: string, rawBody: unknown) {
    const input = applySchema.parse(rawBody);
    const owner = await this.getOwnerMember(organizationId);

    const structure = await this.ensureReadinessStructure({
      organizationId,
      ownerMemberId: owner.id,
      targetCompletion: input.targetCompletion,
    });

    const vendors = await this.upsertVendors(organizationId, [
      ...BASELINE_VENDORS,
      ...input.vendors,
    ]);
    const risks = await this.upsertRisks(organizationId, [
      ...BASELINE_RISKS,
      ...input.risks,
    ]);
    const evidence = await this.ensureEvidenceSubmissions(
      organizationId,
      owner.userId,
    );
    const context = await this.upsertContext(organizationId, input);

    if (input.markOnboardingComplete) {
      await db.organization.update({
        where: { id: organizationId },
        data: {
          onboardingCompleted: true,
          hasAccess: true,
        },
      });
      await db.onboarding.upsert({
        where: { organizationId },
        create: {
          organizationId,
          policies: true,
          employees: true,
          vendors: true,
          integrations: true,
          risk: true,
          team: true,
          tasks: true,
          triggerJobCompleted: true,
        },
        update: {
          policies: true,
          vendors: true,
          integrations: true,
          risk: true,
          team: true,
          tasks: true,
          triggerJobCompleted: true,
          triggerJobId: null,
        },
      });
    }

    const status = await this.getStatus(organizationId);
    return {
      success: true,
      data: {
        structure,
        vendors: { upserted: vendors.length, names: vendors.map((v) => v.name) },
        risks: { upserted: risks.length, titles: risks.map((r) => r.title) },
        evidence,
        context,
        status: status.data,
      },
    };
  }

  async getStatus(organizationId: string) {
    const [
      organization,
      onboarding,
      tasks,
      policies,
      vendors,
      risks,
      evidenceSubmissions,
      connections,
      latestCloudRun,
      frameworks,
    ] = await Promise.all([
      db.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          website: true,
          onboardingCompleted: true,
          hasAccess: true,
        },
      }),
      db.onboarding.findUnique({ where: { organizationId } }),
      db.task.findMany({
        where: { organizationId, archivedAt: null },
        select: { id: true, title: true, status: true, controls: { select: { id: true } } },
      }),
      db.policy.findMany({
        where: { organizationId, archivedAt: null, isArchived: false },
        select: { id: true, name: true, status: true },
      }),
      db.vendor.findMany({
        where: { organizationId },
        select: { id: true, name: true, status: true, website: true },
      }),
      db.risk.findMany({
        where: { organizationId },
        select: { id: true, title: true, status: true, category: true },
      }),
      db.evidenceSubmission.findMany({
        where: { organizationId },
        select: { id: true, formType: true, status: true, submittedAt: true },
      }),
      db.integrationConnection.findMany({
        where: { organizationId, status: { not: 'disconnected' } },
        include: { provider: true },
      }),
      db.integrationCheckRun.findFirst({
        where: { connection: { organizationId } },
        orderBy: { createdAt: 'desc' },
        include: { results: { select: { passed: true, severity: true } } },
      }),
      this.getFrameworkScores(organizationId),
    ]);

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const doneTasks = tasks.filter(
      (task) =>
        task.status === TaskStatus.done ||
        task.status === TaskStatus.not_relevant,
    ).length;
    const publishedPolicies = policies.filter(
      (policy) => policy.status === PolicyStatus.published,
    ).length;
    const approvedEvidence = evidenceSubmissions.filter(
      (submission) => submission.status === 'approved',
    ).length;
    const assessedVendors = vendors.filter(
      (vendor) => vendor.status === VendorStatus.assessed,
    ).length;
    const awsConnections = connections.filter(
      (connection) => connection.provider.slug === 'aws',
    );

    const scoreRows = [
      { done: doneTasks, total: tasks.length },
      { done: publishedPolicies, total: policies.length },
      { done: approvedEvidence, total: Math.max(5, evidenceSubmissions.length) },
      { done: assessedVendors, total: Math.max(1, vendors.length) },
      { done: awsConnections.length > 0 ? 1 : 0, total: 1 },
    ];
    const readinessScore = Math.round(
      scoreRows.reduce((sum, row) => {
        if (row.total === 0) return sum + 100;
        return sum + Math.round((row.done / row.total) * 100);
      }, 0) / scoreRows.length,
    );

    return {
      success: true,
      data: {
        organization,
        onboarding,
        readinessScore,
        counts: {
          tasks: {
            total: tasks.length,
            done: doneTasks,
            remaining: Math.max(0, tasks.length - doneTasks),
            byStatus: this.countBy(tasks.map((task) => task.status)),
          },
          policies: {
            total: policies.length,
            published: publishedPolicies,
            draft: policies.length - publishedPolicies,
          },
          evidence: {
            total: evidenceSubmissions.length,
            approved: approvedEvidence,
            byStatus: this.countBy(evidenceSubmissions.map((e) => e.status)),
          },
          vendors: {
            total: vendors.length,
            assessed: assessedVendors,
          },
          risks: {
            total: risks.length,
            byStatus: this.countBy(risks.map((risk) => risk.status)),
          },
          integrations: {
            total: connections.length,
            aws: awsConnections.length,
          },
        },
        frameworks,
        cloud: latestCloudRun
          ? {
              latestRunId: latestCloudRun.id,
              connectionId: latestCloudRun.connectionId,
              status: latestCloudRun.status,
              totalChecked: latestCloudRun.totalChecked,
              passedCount: latestCloudRun.passedCount,
              failedCount: latestCloudRun.failedCount,
              completedAt: latestCloudRun.completedAt,
              severities: this.countBy(
                latestCloudRun.results.map((result) => result.severity),
              ),
            }
          : null,
        appUrls: {
          overview: `${this.getAppUrl(organization.id)}/overview`,
          frameworks: `${this.getAppUrl(organization.id)}/frameworks`,
          tasks: `${this.getAppUrl(organization.id)}/tasks`,
          cloudTests: `${this.getAppUrl(organization.id)}/cloud-tests`,
          vendors: `${this.getAppUrl(organization.id)}/vendors`,
          risks: `${this.getAppUrl(organization.id)}/risk`,
        },
      },
    };
  }

  private assertBootstrapToken(actual: string | undefined) {
    const expected =
      process.env.COMPCTL_BOOTSTRAP_TOKEN ?? process.env.SERVICE_TOKEN_COMPCTL;
    if (!expected) {
      throw new UnauthorizedException(
        'COMPCTL_BOOTSTRAP_TOKEN is not configured',
      );
    }
    if (!actual) {
      throw new UnauthorizedException('x-compctl-token header is required');
    }

    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    const matches =
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer);
    if (!matches) {
      throw new UnauthorizedException('Invalid compctl bootstrap token');
    }
  }

  private async upsertOrganization(input: RegisterInput) {
    const user = await db.user.upsert({
      where: { email: input.ownerEmail },
      create: {
        email: input.ownerEmail,
        name: input.ownerName,
        emailVerified: true,
      },
      update: { name: input.ownerName },
    });

    let organization = await db.organization.findFirst({
      where: {
        name: input.companyName,
        members: { some: { userId: user.id, role: { contains: 'owner' } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let created = false;
    if (!organization) {
      organization = await db.organization.create({
        data: {
          name: input.companyName,
          website: input.website,
          hasAccess: true,
          onboardingCompleted: false,
          members: {
            create: {
              userId: user.id,
              role: 'owner,admin,auditor,employee',
              department: Departments.it,
              jobTitle: 'Compliance Owner',
            },
          },
          context: {
            createMany: {
              data: [
                {
                  question: 'Which compliance frameworks do you need?',
                  answer: input.framework,
                  tags: ['onboarding', 'compctl'],
                },
                {
                  question: 'What does your company do?',
                  answer:
                    'Fake Type 1 readiness profile generated by compctl for agent-led SOC 2 preparation.',
                  tags: ['onboarding', 'compctl'],
                },
              ],
            },
          },
        },
      });
      created = true;
    }

    const member =
      (await db.member.findFirst({
        where: { organizationId: organization.id, userId: user.id },
      })) ??
      (await db.member.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'owner,admin,auditor,employee',
          department: Departments.it,
          jobTitle: 'Compliance Owner',
        },
      }));

    await db.onboarding.upsert({
      where: { organizationId: organization.id },
      create: { organizationId: organization.id, triggerJobCompleted: false },
      update: {},
    });

    return { user, organization, member, created };
  }

  private async ensureReadinessStructure(params: {
    organizationId: string;
    ownerMemberId: string;
    targetCompletion: number;
  }) {
    const { organizationId, ownerMemberId, targetCompletion } = params;

    const customFramework =
      (await db.customFramework.findFirst({
        where: { organizationId, name: READINESS_FRAMEWORK_NAME },
      })) ??
      (await db.customFramework.create({
        data: {
          organizationId,
          name: READINESS_FRAMEWORK_NAME,
          description:
            'Agent-managed SOC 2 Type 1 readiness framework generated by compctl.',
          version: 'type-1',
        },
      }));

    const frameworkInstance =
      (await db.frameworkInstance.findFirst({
        where: { organizationId, customFrameworkId: customFramework.id },
      })) ??
      (await db.frameworkInstance.create({
        data: { organizationId, customFrameworkId: customFramework.id },
      }));

    const allTasks: Array<{ id: string; title: string }> = [];
    const allPolicies: Array<{ id: string; name: string }> = [];
    const allControls: Array<{ id: string; name: string }> = [];

    for (const requirement of READINESS_REQUIREMENTS) {
      const customRequirement = await db.customRequirement.upsert({
        where: {
          customFrameworkId_identifier: {
            customFrameworkId: customFramework.id,
            identifier: requirement.identifier,
          },
        },
        create: {
          organizationId,
          customFrameworkId: customFramework.id,
          identifier: requirement.identifier,
          name: requirement.name,
          description: requirement.description,
        },
        update: {
          name: requirement.name,
          description: requirement.description,
        },
      });

      const control =
        (await db.control.findFirst({
          where: { organizationId, name: requirement.control },
        })) ??
        (await db.control.create({
          data: {
            organizationId,
            name: requirement.control,
            description: requirement.description,
          },
        }));
      allControls.push({ id: control.id, name: control.name });

      await db.requirementMap.upsert({
        where: {
          controlId_frameworkInstanceId_customRequirementId: {
            controlId: control.id,
            frameworkInstanceId: frameworkInstance.id,
            customRequirementId: customRequirement.id,
          },
        },
        create: {
          controlId: control.id,
          frameworkInstanceId: frameworkInstance.id,
          customRequirementId: customRequirement.id,
        },
        update: { archivedAt: null },
      });

      await db.controlDocumentType.createMany({
        data: [
          {
            controlId: control.id,
            formType: requirement.evidenceFormType,
          },
        ],
        skipDuplicates: true,
      });

      const policy = await this.ensurePolicy({
        organizationId,
        ownerMemberId,
        name: requirement.policy,
        description: requirement.description,
      });
      allPolicies.push({ id: policy.id, name: policy.name });

      await db.control.update({
        where: { id: control.id },
        data: { policies: { connect: { id: policy.id } } },
      });

      for (const title of requirement.tasks) {
        const task = await this.ensureTask({
          organizationId,
          ownerMemberId,
          title,
          description: `${requirement.identifier}: ${requirement.description}`,
        });
        allTasks.push({ id: task.id, title: task.title });

        await db.control.update({
          where: { id: control.id },
          data: { tasks: { connect: { id: task.id } } },
        });
      }
    }

    const targetDone = Math.floor(allTasks.length * targetCompletion);
    await Promise.all(
      allTasks.map((task, index) =>
        db.task.update({
          where: { id: task.id },
          data: {
            status: index < targetDone ? TaskStatus.done : TaskStatus.todo,
            lastCompletedAt: index < targetDone ? new Date() : null,
            reviewDate:
              index < targetDone
                ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                : null,
          },
        }),
      ),
    );

    return {
      frameworkInstanceId: frameworkInstance.id,
      customFrameworkId: customFramework.id,
      controls: allControls.length,
      policies: allPolicies.length,
      tasks: allTasks.length,
      targetDone,
    };
  }

  private async ensurePolicy(params: {
    organizationId: string;
    ownerMemberId: string;
    name: string;
    description: string;
  }) {
    const content = this.policyContent(params.name, params.description);
    const existing = await db.policy.findFirst({
      where: { organizationId: params.organizationId, name: params.name },
    });

    if (existing) {
      const policy = await db.policy.update({
        where: { id: existing.id },
        data: {
          description: params.description,
          status: PolicyStatus.published,
          assigneeId: params.ownerMemberId,
          department: Departments.it,
          frequency: 'yearly',
          content: { set: content },
          draftContent: { set: [] },
          lastPublishedAt: new Date(),
        },
      });
      if (policy.currentVersionId) {
        await db.policyVersion.update({
          where: { id: policy.currentVersionId },
          data: {
            content: { set: content },
            changelog: 'Updated by compctl SOC 2 readiness apply',
            publishedById: params.ownerMemberId,
          },
        });
      } else {
        const version = await db.policyVersion.create({
          data: {
            policyId: policy.id,
            version: 1,
            content: { set: content },
            changelog: 'Published by compctl SOC 2 readiness apply',
            publishedById: params.ownerMemberId,
          },
        });
        await db.policy.update({
          where: { id: policy.id },
          data: { currentVersionId: version.id },
        });
      }
      return policy;
    }

    const policy = await db.policy.create({
      data: {
        organizationId: params.organizationId,
        name: params.name,
        description: params.description,
        status: PolicyStatus.published,
        assigneeId: params.ownerMemberId,
        department: Departments.it,
        frequency: 'yearly',
        content: { set: content },
        draftContent: { set: [] },
        lastPublishedAt: new Date(),
      },
    });
    const version = await db.policyVersion.create({
      data: {
        policyId: policy.id,
        version: 1,
        content: { set: content },
        changelog: 'Published by compctl SOC 2 readiness apply',
        publishedById: params.ownerMemberId,
      },
    });
    return db.policy.update({
      where: { id: policy.id },
      data: { currentVersionId: version.id },
    });
  }

  private async ensureTask(params: {
    organizationId: string;
    ownerMemberId: string;
    title: string;
    description: string;
  }) {
    const existing = await db.task.findFirst({
      where: { organizationId: params.organizationId, title: params.title },
    });
    if (existing) {
      return db.task.update({
        where: { id: existing.id },
        data: {
          description: params.description,
          assigneeId: params.ownerMemberId,
          frequency: TaskFrequency.quarterly,
          department: Departments.it,
          automationStatus: TaskAutomationStatus.MANUAL,
        },
      });
    }

    return db.task.create({
      data: {
        organizationId: params.organizationId,
        title: params.title,
        description: params.description,
        assigneeId: params.ownerMemberId,
        frequency: TaskFrequency.quarterly,
        department: Departments.it,
        automationStatus: TaskAutomationStatus.MANUAL,
      },
    });
  }

  private async upsertVendors(organizationId: string, vendors: VendorInput[]) {
    const deduped = new Map<string, VendorInput>();
    for (const vendor of vendors) {
      deduped.set(vendor.name.toLowerCase(), vendor);
    }

    const results: Array<{ id: string; name: string }> = [];
    for (const vendor of deduped.values()) {
      const existing = await db.vendor.findFirst({
        where: { organizationId, name: { equals: vendor.name, mode: 'insensitive' } },
      });
      const data = {
        name: vendor.name,
        website: vendor.website,
        description:
          vendor.description ??
          `${vendor.name} identified by compctl during SOC 2 readiness inspection.`,
        category: this.toVendorCategory(vendor.category),
        status: VendorStatus.assessed,
        inherentProbability: Likelihood.possible,
        inherentImpact: Impact.moderate,
        residualProbability: Likelihood.unlikely,
        residualImpact: Impact.minor,
        isSubProcessor: vendor.isSubProcessor ?? true,
      };
      const saved = existing
        ? await db.vendor.update({ where: { id: existing.id }, data })
        : await db.vendor.create({ data: { ...data, organizationId } });
      results.push({ id: saved.id, name: saved.name });
    }
    return results;
  }

  private async upsertRisks(organizationId: string, risks: RiskInput[]) {
    const deduped = new Map<string, RiskInput>();
    for (const risk of risks) {
      deduped.set(risk.title.toLowerCase(), risk);
    }

    const results: Array<{ id: string; title: string }> = [];
    for (const risk of deduped.values()) {
      const existing = await db.risk.findFirst({
        where: { organizationId, title: { equals: risk.title, mode: 'insensitive' } },
      });
      const data = {
        title: risk.title,
        description:
          risk.description ??
          `${risk.title} identified by compctl during SOC 2 readiness inspection.`,
        category: this.toRiskCategory(risk.category),
        department: Departments.it,
        status: RiskStatus.open,
        likelihood: Likelihood.possible,
        impact: Impact.moderate,
        residualLikelihood: Likelihood.unlikely,
        residualImpact: Impact.minor,
        treatmentStrategy: RiskTreatmentType.mitigate,
        treatmentStrategyDescription:
          'Track owner, evidence, monitoring, and quarterly review cadence before Type 1 audit.',
      };
      const saved = existing
        ? await db.risk.update({ where: { id: existing.id }, data })
        : await db.risk.create({ data: { ...data, organizationId } });
      results.push({ id: saved.id, title: saved.title });
    }
    return results;
  }

  private async ensureEvidenceSubmissions(
    organizationId: string,
    submittedById: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const submissions: Array<{
      formType: EvidenceFormType;
      data: Prisma.InputJsonValue;
    }> = [
      {
        formType: EvidenceFormType.board_meeting,
        data: {
          compctlGenerated: true,
          submissionDate: today,
          attendees: 'CEO, CTO, Compliance Owner',
          date: today,
          meetingMinutes:
            'Reviewed SOC 2 Type 1 readiness scope, accountable owners, open risks, and evidence plan.',
          meetingMinutesApprovedBy: 'CEO',
          approvedDate: today,
        },
      },
      {
        formType: EvidenceFormType.rbac_matrix,
        data: {
          compctlGenerated: true,
          submissionDate: today,
          matrixRows: [
            {
              system: 'AWS',
              roleName: 'CompAI-Auditor',
              permissionsScope: 'SecurityAudit and ViewOnlyAccess',
              approvedBy: 'Compliance Owner',
              lastReviewed: today,
            },
            {
              system: 'GitHub',
              roleName: 'Repository Admin',
              permissionsScope: 'Branch protection and code review settings',
              approvedBy: 'CTO',
              lastReviewed: today,
            },
          ],
        },
      },
      {
        formType: EvidenceFormType.infrastructure_inventory,
        data: {
          compctlGenerated: true,
          submissionDate: today,
          inventoryRows: [
            {
              assetId: 'aws-production',
              systemType: 'AWS account and ECS/RDS infrastructure',
              environment: 'production',
              location: 'eu-central-1',
              assignedOwner: 'CTO',
              lastReviewed: today,
            },
          ],
        },
      },
      {
        formType: EvidenceFormType.network_diagram,
        data: {
          compctlGenerated: true,
          submissionDate: today,
          diagramUrl: 'https://example.com/fake-soc2-network-diagram',
        },
      },
      {
        formType: EvidenceFormType.tabletop_exercise,
        data: {
          compctlGenerated: true,
          submissionDate: today,
          exerciseDate: today,
          facilitator: 'Compliance Owner',
          scenarioType: 'data-breach',
          scenarioDescription:
            'Simulated unauthorized cloud access and customer data exposure response.',
          attendees: [
            {
              name: 'Compliance Owner',
              roleTitle: 'Facilitator',
              department: 'Security',
            },
          ],
          sessionNotes:
            'Validated escalation, customer notification draft, evidence preservation, and remediation tracking.',
          actionItems: [
            {
              finding: 'Need quarterly access review evidence',
              improvementAction: 'Schedule and attach access review export',
              assignedOwner: 'CTO',
              dueDate: today,
            },
          ],
        },
      },
    ];

    let created = 0;
    for (const submission of submissions) {
      const existing = await db.evidenceSubmission.findFirst({
        where: { organizationId, formType: submission.formType },
      });
      if (existing) continue;
      await db.evidenceSubmission.create({
        data: {
          organizationId,
          formType: submission.formType,
          submittedById,
          data: submission.data,
          status: 'approved',
          reviewedById: submittedById,
          reviewedAt: new Date(),
        },
      });
      created += 1;
    }

    return { ensured: submissions.length, created };
  }

  private async upsertContext(organizationId: string, input: ApplyInput) {
    const entries = [
      {
        question: 'Compctl repository inspection context',
        answer: JSON.stringify(input.repoContext ?? {}, null, 2),
        tags: ['compctl', 'github', 'repository', 'onboarding'],
      },
      {
        question: 'Compctl readiness target completion',
        answer: String(input.targetCompletion),
        tags: ['compctl', 'onboarding'],
      },
    ];

    let upserted = 0;
    for (const entry of entries) {
      const existing = await db.context.findFirst({
        where: { organizationId, question: entry.question },
      });
      if (existing) {
        await db.context.update({
          where: { id: existing.id },
          data: { answer: entry.answer, tags: entry.tags },
        });
      } else {
        await db.context.create({ data: { organizationId, ...entry } });
      }
      upserted += 1;
    }
    return { upserted };
  }

  private async getOwnerMember(organizationId: string) {
    const owner = await db.member.findFirst({
      where: {
        organizationId,
        deactivated: false,
        role: { contains: 'owner' },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (owner) return owner;

    const member = await db.member.findFirst({
      where: { organizationId, deactivated: false },
      orderBy: { createdAt: 'asc' },
    });
    if (!member) {
      throw new BadRequestException('Organization has no member to own readiness work');
    }
    return member;
  }

  private async getFrameworkScores(organizationId: string) {
    const frameworkInstances = await db.frameworkInstance.findMany({
      where: { organizationId },
      include: {
        framework: { select: { name: true } },
        customFramework: { select: { name: true } },
        requirementsMapped: {
          where: { archivedAt: null },
          include: {
            control: {
              include: {
                policies: { select: { id: true, status: true } },
                tasks: { select: { id: true, status: true } },
              },
            },
          },
        },
      },
    });

    return frameworkInstances.map((frameworkInstance) => {
      const controls = frameworkInstance.requirementsMapped
        .map((map) => map.control)
        .filter((control, index, list) => list.findIndex((c) => c.id === control.id) === index);
      const policyMap = new Map<string, PolicyStatus>();
      const taskMap = new Map<string, TaskStatus>();
      for (const control of controls) {
        for (const policy of control.policies) policyMap.set(policy.id, policy.status);
        for (const task of control.tasks) taskMap.set(task.id, task.status);
      }
      const totalPolicies = policyMap.size;
      const publishedPolicies = [...policyMap.values()].filter(
        (status) => status === PolicyStatus.published,
      ).length;
      const totalTasks = taskMap.size;
      const doneTasks = [...taskMap.values()].filter(
        (status) =>
          status === TaskStatus.done || status === TaskStatus.not_relevant,
      ).length;
      const policyScore =
        totalPolicies > 0 ? Math.round((publishedPolicies / totalPolicies) * 100) : 100;
      const taskScore =
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 100;
      return {
        id: frameworkInstance.id,
        name:
          frameworkInstance.framework?.name ??
          frameworkInstance.customFramework?.name ??
          'Framework',
        controls: controls.length,
        policies: { total: totalPolicies, published: publishedPolicies },
        tasks: { total: totalTasks, done: doneTasks },
        complianceScore: Math.round((policyScore + taskScore) / 2),
      };
    });
  }

  private policyContent(
    name: string,
    description: string,
  ): Prisma.InputJsonValue[] {
    return [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: name }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: description }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text:
              'This fake Type 1 readiness policy was generated by compctl for audit preparation. Management will review it annually and update it when systems, vendors, or risks materially change.',
          },
        ],
      },
    ];
  }

  private toVendorCategory(category: string | undefined): VendorCategory {
    if (!category) return VendorCategory.other;
    const normalized = category.replace(/-/g, '_') as keyof typeof VendorCategory;
    return VendorCategory[normalized] ?? VendorCategory.other;
  }

  private toRiskCategory(category: string | undefined): RiskCategory {
    if (!category) return RiskCategory.technology;
    const normalized = category.replace(/-/g, '_') as keyof typeof RiskCategory;
    return RiskCategory[normalized] ?? RiskCategory.technology;
  }

  private countBy(values: Array<string | null>): Record<string, number> {
    return values.reduce<Record<string, number>>((acc, value) => {
      const key = value ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }

  private getRoleAssumerArn() {
    return (
      process.env.SECURITY_HUB_ROLE_ASSUMER_ARN ??
      process.env.COMPCTL_AWS_ROLE_ASSUMER_ARN ??
      'arn:aws:iam::684120556289:role/roleAssumer'
    );
  }

  private getApiUrl() {
    return process.env.COMP_API_URL ?? 'http://localhost:3333';
  }

  private getAppUrl(organizationId: string) {
    const base =
      process.env.COMP_APP_URL ??
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
      'http://localhost:3000';
    return `${base.replace(/\/$/, '')}/${organizationId}`;
  }
}
