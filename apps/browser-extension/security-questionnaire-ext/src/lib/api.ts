import { z } from 'zod';
import { extensionConfig } from './config';
import type { AuthState, GeneratedAnswer, Organization } from './types';

const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullable().optional(),
  memberRole: z.string().nullable().optional(),
  memberId: z.string().nullable().optional(),
});

const AuthMeSchema = z.object({
  user: z
    .object({
      id: z.string(),
      email: z.string(),
      name: z.string().nullable().optional(),
    })
    .nullable(),
  organizations: z.array(OrganizationSchema),
});

const SessionSchema = z
  .object({
    session: z
      .object({
        activeOrganizationId: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .nullable();

const GeneratedAnswerSchema = z.object({
  success: z.boolean(),
  data: z.object({
    questionIndex: z.number(),
    question: z.string(),
    answer: z.string().nullable().optional(),
    sources: z.array(z.unknown()).optional(),
    error: z.string().nullable().optional(),
  }),
});

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = data.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

async function fetchJson(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${extensionConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(data, `Request failed: ${response.status}`));
  }
  return data;
}

export async function getAuthState(
  selectedOrganizationId: string | null,
): Promise<AuthState> {
  const [data, sessionData] = await Promise.all([
    fetchJson('/v1/auth/me', { method: 'GET' }),
    fetchJson('/api/auth/get-session', { method: 'GET' }).catch(() => null),
  ]);
  const parsed = AuthMeSchema.parse(data);
  const session = SessionSchema.parse(sessionData);
  const validSelectedOrg = resolveSelectedOrganization({
    organizations: parsed.organizations,
    selectedOrganizationId,
    activeOrganizationId: session?.session?.activeOrganizationId ?? null,
  });

  return {
    status: parsed.user ? 'authenticated' : 'unauthenticated',
    user: parsed.user,
    organizations: parsed.organizations,
    selectedOrganizationId: validSelectedOrg,
    apiBaseUrl: extensionConfig.apiBaseUrl,
    appBaseUrl: extensionConfig.appBaseUrl,
  };
}

export async function setActiveOrganization(
  organizationId: string,
): Promise<void> {
  await fetchJson('/api/auth/organization/set-active', {
    method: 'POST',
    body: JSON.stringify({ organizationId }),
  });
}

export async function generateAnswer(params: {
  organizationId: string;
  question: string;
  questionIndex: number;
  totalQuestions: number;
}): Promise<GeneratedAnswer> {
  const data = await fetchJson('/v1/questionnaire/answer-single', {
    method: 'POST',
    body: JSON.stringify({
      question: params.question,
      questionIndex: params.questionIndex,
      totalQuestions: params.totalQuestions,
      organizationId: params.organizationId,
    }),
  });
  const parsed = GeneratedAnswerSchema.parse(data);
  return {
    questionIndex: parsed.data.questionIndex,
    question: parsed.data.question,
    answer: parsed.data.answer ?? null,
    sources: parsed.data.sources ?? [],
    error: parsed.data.error,
  };
}

function resolveSelectedOrganization(params: {
  organizations: Organization[];
  selectedOrganizationId: string | null;
  activeOrganizationId: string | null;
}): string | null {
  if (params.organizations.length === 0) return null;
  const storedSelection = params.organizations.find(
    (org) => org.id === params.selectedOrganizationId,
  );
  if (storedSelection) return storedSelection.id;

  const activeSelection = params.organizations.find(
    (org) => org.id === params.activeOrganizationId,
  );
  if (activeSelection) return activeSelection.id;

  return params.organizations.length === 1 ? params.organizations[0].id : null;
}
