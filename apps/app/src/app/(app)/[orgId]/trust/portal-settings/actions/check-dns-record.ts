'use server';

import { authActionClient } from '@/actions/safe-action';
import { env } from '@/env.mjs';
import { db } from '@db';
import { Vercel } from '@vercel/sdk';
import * as dns from 'node:dns';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const dnsPromises = dns.promises;

/**
 * Strict pattern to match known Vercel DNS CNAME targets.
 * Matches formats like:
 * - cname.vercel-dns.com
 * - 3a69a5bb27875189.vercel-dns-016.com
 * - With or without trailing dot
 */
const VERCEL_DNS_CNAME_PATTERN = /\.vercel-dns(-\d+)?\.com\.?$/i;

/**
 * Fallback pattern - more lenient, catches any vercel-dns variation.
 * Used if strict pattern fails, with logging for monitoring.
 */
const VERCEL_DNS_FALLBACK_PATTERN = /vercel-dns[^.]*\.com\.?$/i;

const checkDnsSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain cannot be empty.')
    .max(63, 'Domain too long. Max 63 chars.')
    .regex(
      /^(?!-)[A-Za-z0-9-]+([-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,63}$/,
      'Invalid domain format. Use format like sub.example.com',
    )
    .trim(),
});

const vercel = new Vercel({
  bearerToken: env.VERCEL_ACCESS_TOKEN,
});

export const checkDnsRecordAction = authActionClient
  .inputSchema(checkDnsSchema)
  .metadata({
    name: 'check-dns-record',
    track: {
      event: 'add-custom-domain',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { domain } = parsedInput;

    if (!ctx.session.activeOrganizationId) {
      throw new Error('No active organization');
    }

    const rootDomain = domain.split('.').slice(-2).join('.');
    const activeOrgId = ctx.session.activeOrganizationId;

    // Use Node's built-in DNS (no HTTPS) to avoid SSL/certificate issues with external APIs
    const getCnameRecords = (host: string): Promise<string[]> =>
      dnsPromises.resolve(host, 'CNAME').catch(() => []);
    const getTxtRecords = (host: string): Promise<string[][]> =>
      dnsPromises.resolve(host, 'TXT').catch(() => []);

    const [cnameRecords, txtRecords, vercelTxtRecords] = await Promise.all([
      getCnameRecords(domain),
      getTxtRecords(rootDomain),
      getTxtRecords(`_vercel.${rootDomain}`),
    ]);
    const isVercelDomain = await db.trust.findUnique({
      where: {
        organizationId: activeOrgId,
        domain,
      },
      select: {
        isVercelDomain: true,
        vercelVerification: true,
      },
    });
    const expectedTxtValue = `compai-domain-verification=${activeOrgId}`;
    const expectedVercelTxtValue = isVercelDomain?.vercelVerification;

    let isCnameVerified = false;

    if (cnameRecords.length > 0) {
      // First try strict pattern
      isCnameVerified = cnameRecords.some((address) =>
        VERCEL_DNS_CNAME_PATTERN.test(address),
      );

      // If strict fails, try fallback pattern (catches new Vercel patterns we haven't seen)
      if (!isCnameVerified) {
        const fallbackMatch = cnameRecords.find((address) =>
          VERCEL_DNS_FALLBACK_PATTERN.test(address),
        );

        if (fallbackMatch) {
          console.warn(
            `[DNS Check] CNAME matched fallback pattern but not strict pattern. ` +
              `Address: ${fallbackMatch}. Consider updating VERCEL_DNS_CNAME_PATTERN.`,
          );
          isCnameVerified = true;
        }
      }
    }

    // Node's resolve(host, 'TXT') returns string[][] - each inner array is one TXT record
    const txtRecordMatches = (records: string[][], expected: string | null) =>
      expected != null &&
      records.some((segments) => segments.some((s) => s === expected));

    const isTxtVerified = txtRecordMatches(txtRecords, expectedTxtValue);
    const isVercelTxtVerified = txtRecordMatches(
      vercelTxtRecords,
      expectedVercelTxtValue ?? null,
    );

    const isVerified = isCnameVerified && isTxtVerified && isVercelTxtVerified;

    if (!isVerified) {
      return {
        success: false,
        isCnameVerified,
        isTxtVerified,
        isVercelTxtVerified,
        error:
          'Error verifying DNS records. Please ensure both CNAME and TXT records are correctly configured, or wait a few minutes and try again.',
      };
    }

    if (!env.TRUST_PORTAL_PROJECT_ID) {
      return {
        success: false,
        error: 'Vercel project ID is not set.',
      };
    }

    await db.trust.upsert({
      where: {
        organizationId: activeOrgId,
        domain,
      },
      update: {
        domainVerified: true,
        status: 'published',
      },
      create: {
        organizationId: activeOrgId,
        domain,
        status: 'published',
      },
    });

    revalidatePath(`/${activeOrgId}/trust`);
    revalidatePath(`/${activeOrgId}/trust/portal-settings`);
    revalidateTag(`organization_${activeOrgId}`, 'max');

    return {
      success: true,
      isCnameVerified,
      isTxtVerified,
      isVercelTxtVerified,
    };
  });
