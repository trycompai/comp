import { z } from 'zod';
import { CYBEDEFEND_REGION_IDS, TENANT_PATTERN } from './regions';

/**
 * Connection form.
 *
 * The region is a selector, never a free-text URL: CybeDefend is deployed per
 * region and both the API and Logto endpoints are derived from the choice, so
 * a US customer connects without a patch and no other host is reachable.
 */
export const cybedefendCredentialFields = [
  {
    id: 'region',
    label: 'Region',
    type: 'select' as const,
    required: true,
    placeholder: 'Select your CybeDefend region',
    helpText:
      'The region your CybeDefend organization lives in. Choosing the wrong one fails authentication.',
    options: [
      { value: 'eu', label: 'Europe (eu.cybedefend.com)' },
      { value: 'us', label: 'United States (us.cybedefend.com)' },
      { value: 'dedicated', label: 'Dedicated tenant' },
    ],
  },
  {
    id: 'tenant',
    label: 'Tenant name',
    type: 'text' as const,
    required: true,
    placeholder: 'acme',
    helpText: 'The name in your CybeDefend URL. For acme.cybedefend.com, enter "acme".',
    // Only asked for when the dedicated option is chosen.
    showIf: { field: 'region', equals: 'dedicated' },
  },
  {
    id: 'organizationId',
    label: 'Organization ID',
    type: 'text' as const,
    required: true,
    placeholder: '00000000-0000-0000-0000-000000000000',
    helpText: 'Found in the CybeDefend URL when your organization is selected.',
  },
  {
    id: 'personalAccessToken',
    label: 'Personal Access Token',
    type: 'password' as const,
    required: true,
    placeholder: 'pat_…',
    helpText:
      'Profile → Personal Access Tokens in CybeDefend. Shown once. Prefer a dedicated service account holding only the export_findings permission. A token issued to a person inherits every permission that person is later granted.',
  },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const cybedefendCredentialSchema = z
  .object({
    region: z.enum(CYBEDEFEND_REGION_IDS),
    tenant: z.string().trim().toLowerCase().optional(),
    organizationId: z
      .string()
      .trim()
      .regex(UUID, 'Organization ID must be a UUID, as shown in the CybeDefend URL.'),
    personalAccessToken: z.string().trim().min(1, 'Personal access token is required.'),
  })
  // Caught at the form rather than mid-run: a dedicated tenant with no name has
  // no URLs to derive, and a malformed one must never reach the interpolation.
  .superRefine((value, ctx) => {
    if (value.region !== 'dedicated') return;

    if (!value.tenant) {
      ctx.addIssue({
        code: 'custom',
        path: ['tenant'],
        message: 'Tenant name is required for a dedicated tenant.',
      });
      return;
    }

    if (!TENANT_PATTERN.test(value.tenant)) {
      ctx.addIssue({
        code: 'custom',
        path: ['tenant'],
        message:
          'Tenant name may only contain lowercase letters, digits and hyphens, and cannot start or end with a hyphen.',
      });
    }
  });

export const cybedefendSetupInstructions = `To connect CybeDefend:

1. Sign in to CybeDefend at eu.cybedefend.com, us.cybedefend.com, or your own
   dedicated tenant.
2. Open Profile → Personal Access Tokens and create a token. The value is shown once.
3. Copy your Organization ID from the URL.
4. Pick the matching region above, then paste both values.

On a dedicated tenant, choose "Dedicated tenant" and enter its name: the part
before .cybedefend.com in your URL. For acme.cybedefend.com, enter "acme".

The account holding the token needs the export_findings permission on the
organization. We recommend a dedicated service account rather than a personal
one: a personal token silently gains write access if that person is promoted.`;
