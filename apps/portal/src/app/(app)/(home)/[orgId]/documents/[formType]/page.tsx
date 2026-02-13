import { auth } from '@/app/lib/auth';
import { env } from '@/env.mjs';
import { Breadcrumb, PageLayout } from '@trycompai/design-system';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { headers as getHeaders } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { evidenceFormDefinitions, evidenceFormTypeSchema } from '../forms';
import { PortalFormClient } from './PortalFormClient';

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

async function getJwtToken(cookieHeader: string): Promise<string | null> {
  if (!cookieHeader) return null;

  try {
    // Use the main app's auth URL — the API validates JWTs against the main
    // app's JWKS, so the token must be issued by the main app, not the portal.
    const authUrl = env.APP_AUTH_URL || 'http://localhost:3000';
    const tokenResponse = await fetch(`${authUrl}/api/auth/token`, {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    });

    if (!tokenResponse.ok) return null;

    const tokenData = await tokenResponse.json();
    return tokenData?.token ?? null;
  } catch (error) {
    console.warn('Failed to get JWT token:', error);
    return null;
  }
}

export default async function PortalCompanyFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; formType: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { orgId, formType } = await params;
  const parsedType = evidenceFormTypeSchema.safeParse(formType);
  if (!parsedType.success) {
    notFound();
  }

  const formTypeValue = parsedType.data;
  const form = evidenceFormDefinitions[formTypeValue];
  if (!form.portalAccessible) {
    notFound();
  }
  const visibleFields = form.fields;
  const basePath = `/${orgId}/documents/${formTypeValue}`;
  const state = await searchParams;

  async function submitAction(formData: FormData) {
    'use server';

    const reqHeaders = await getHeaders();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      redirect('/auth');
    }

    const apiUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
    const cookie = reqHeaders.get('cookie') ?? '';

    // Get JWT token for API authentication
    const jwtToken = await getJwtToken(cookie);
    if (!jwtToken) {
      redirect(`${basePath}?error=${encodeURIComponent('Failed to authenticate with API')}`);
    }

    const apiHeaders = {
      'Content-Type': 'application/json',
      'X-Organization-Id': orgId,
      Authorization: `Bearer ${jwtToken}`,
    };

    try {
      // Build the submission payload
      const payload: Record<string, unknown> = {};
      payload.submissionDate = new Date().toISOString();

      for (const field of visibleFields) {
        if (field.type === 'file') {
          const raw = formData.get(field.key);
          if (!(raw instanceof File) || raw.size === 0) {
            if (field.required) {
              throw new Error(`${field.label} is required`);
            }
            continue;
          }
          if (raw.size > MAX_FILE_SIZE_BYTES) {
            throw new Error(`File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`);
          }

          // Upload file via API
          const fileBuffer = Buffer.from(await raw.arrayBuffer());
          const fileBase64 = fileBuffer.toString('base64');

          const uploadRes = await fetch(`${apiUrl}/v1/evidence-forms/uploads`, {
            method: 'POST',
            headers: apiHeaders,
            body: JSON.stringify({
              formType: formTypeValue,
              fileName: raw.name,
              fileType: raw.type || 'application/octet-stream',
              fileData: fileBase64,
            }),
          });

          if (!uploadRes.ok) {
            const errorText = await uploadRes.text();
            throw new Error(`File upload failed: ${errorText}`);
          }

          const uploadData = await uploadRes.json();
          payload[field.key] = uploadData;
          continue;
        }

        const value = String(formData.get(field.key) ?? '').trim();
        if (field.required && value.length === 0) {
          throw new Error(`${field.label} is required`);
        }
        if (value.length > 0) {
          payload[field.key] = value;
        }
      }

      // Submit via API
      const submitRes = await fetch(`${apiUrl}/v1/evidence-forms/${formTypeValue}/submissions`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(payload),
      });

      if (!submitRes.ok) {
        const errorText = await submitRes.text();
        throw new Error(`Submission failed: ${errorText}`);
      }

      redirect(`${basePath}/submissions?success=1`);
    } catch (error) {
      // Next.js redirect throws a special error — re-throw it
      if (isRedirectError(error)) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit form';
      redirect(`${basePath}?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  // Serialize fields to plain objects for client component
  const serializedFields = visibleFields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    ...(field.placeholder ? { placeholder: field.placeholder } : {}),
    ...(field.description ? { description: field.description } : {}),
    ...(field.options
      ? { options: field.options.map((o) => ({ label: o.label, value: o.value })) }
      : {}),
    ...(field.accept ? { accept: field.accept } : {}),
  }));

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Employee Portal',
            href: `/${orgId}`,
            props: { render: <Link href={`/${orgId}`} /> },
          },
          { label: form.title, isCurrent: true },
        ]}
      />
      <PortalFormClient
        formTitle={form.title}
        formDescription={form.description}
        fields={serializedFields}
        submitAction={submitAction}
        successMessage={state.success === '1'}
        errorMessage={state.error ? decodeURIComponent(state.error) : undefined}
      />
    </PageLayout>
  );
}
