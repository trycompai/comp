import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import { generateObject } from 'ai';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const maxDuration = 30;

const meetingTypeRequirements: Record<string, string[]> = {
  'board-meeting': [
    'Risk Management and Compliance — risk assessment results, mitigation strategies, internal controls, regulatory concerns',
    'Cybersecurity and Data Protection — cybersecurity measures, data protection policies or incidents',
    'Business Continuity — contingency plans, disaster recovery, operational resilience',
    'Fraud and Misconduct Mitigation — fraud prevention strategies, misconduct risk discussion',
  ],
  'it-leadership-meeting': [
    'Firewall Rules — review of firewall rules, configurations, or necessary changes',
    'Asset Registry — review and update of the asset registry, documentation of new assets',
    'Baseline Configuration and Endpoint Hardening — endpoint hardening requirements, configuration updates',
    'Cloud Infrastructure Security — review of cloud provider logs, unusual activity monitoring',
  ],
  'risk-committee-meeting': [
    'Internal Compliance Assessment — compliance audits, corrective actions',
    'Risk Assessment — organization-wide risk review, new risks identified, mitigation strategies',
    'Approval of New Security Measures — new security measures discussed or approved',
    'Fraud and Misconduct Mitigation — fraud risk discussion, prevention measures',
  ],
};

const requestSchema = z.object({
  meetingMinutes: z.string().min(1),
  meetingType: z.enum(['board-meeting', 'it-leadership-meeting', 'risk-committee-meeting']),
});

const analysisResultSchema = z.object({
  requirements: z.array(
    z.object({
      topic: z.string().describe('The security topic name'),
      covered: z.boolean().describe('Whether the meeting minutes adequately address this topic'),
      detail: z
        .string()
        .describe('Brief explanation of what was found or what is missing (1-2 sentences)'),
    }),
  ),
  overallPass: z
    .boolean()
    .describe('True only if ALL required security topics are adequately covered'),
  summary: z.string().describe('One-line summary of the analysis result for the user'),
});

export type MeetingMinutesAnalysisResult = z.infer<typeof analysisResultSchema>;

export async function POST(req: Request) {
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI analysis is not configured.' }, { status: 500 });
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const organizationId =
    req.headers.get('x-organization-id')?.trim() ?? session.session.activeOrganizationId;

  if (!organizationId) {
    return NextResponse.json(
      { error: 'Organization context required (missing X-Organization-Id).' },
      { status: 400 },
    );
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      deactivated: false,
    },
    select: { id: true },
  });

  if (!member) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request: meetingMinutes and meetingType are required.' },
      { status: 400 },
    );
  }

  const { meetingMinutes, meetingType } = parsed.data;
  const requirements = meetingTypeRequirements[meetingType];

  if (!requirements) {
    return NextResponse.json({ error: 'Unknown meeting type.' }, { status: 400 });
  }

  const requirementsList = requirements.map((r, i) => `${i + 1}. ${r}`).join('\n');

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: analysisResultSchema,
      system: `You are a GRC (Governance, Risk, and Compliance) expert reviewing meeting minutes for compliance evidence. Your job is to determine whether the meeting minutes adequately cover required security topics.

Be reasonably lenient — the minutes do not need to use the exact same wording as the requirements. Look for substantive discussion of the topic, even if phrased differently. Brief mentions or agenda placeholders without substance should be marked as not covered.`,
      prompt: `Analyze the following meeting minutes and check whether each required security topic is adequately covered.

REQUIRED SECURITY TOPICS:
${requirementsList}

MEETING MINUTES:
${meetingMinutes.slice(0, 8000)}

For each required topic, determine if the minutes contain substantive discussion of that topic. Return your analysis as structured data.`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error('[analyze-meeting-minutes] AI analysis failed:', error);
    return NextResponse.json(
      { error: 'AI analysis failed. You may submit without analysis.' },
      { status: 500 },
    );
  }
}
