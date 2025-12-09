'use server';

import { authActionClient } from '@/actions/safe-action';
import { env } from '@/env.mjs';
import { db } from '@db';
import { Vercel } from '@vercel/sdk';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const checkDnsSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain cannot be empty.')
    .max(63, 'Domain too long. Max 63 chars.')
    .regex(
      /^(?!-)[A-Za-z0-9-]+([-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/,
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

    const response = await fetch(`https://networkcalc.com/api/dns/lookup/${domain}`);
    const txtResponse = await fetch(
      `https://networkcalc.com/api/dns/lookup/${rootDomain}?type=TXT`,
    );
    const vercelTxtResponse = await fetch(
      `https://networkcalc.com/api/dns/lookup/_vercel.${rootDomain}?type=TXT`,
    );

    const data = await response.json();
    const txtData = await txtResponse.json();
    const vercelTxtData = await vercelTxtResponse.json();

    if (
      response.status !== 200 ||
      data.status !== 'OK' ||
      txtResponse.status !== 200 ||
      txtData.status !== 'OK'
    ) {
      console.error('DNS lookup failed:', data);
      throw new Error(
        data.message ||
          'DNS record verification failed, check the records are valid or try again later.',
      );
    }

    const cnameRecords = data.records?.CNAME;
    const txtRecords = txtData.records?.TXT;
    const vercelTxtRecords = vercelTxtData.records?.TXT;
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
    const expectedCnameValue = 'cname.vercel-dns.com';
    const expectedTxtValue = `compai-domain-verification=${activeOrgId}`;
    const expectedVercelTxtValue = isVercelDomain?.vercelVerification;

    let isCnameVerified = false;

    if (cnameRecords) {
      isCnameVerified = cnameRecords.some(
        (record: { address: string }) => record.address.toLowerCase() === expectedCnameValue,
      );
    }

    let isTxtVerified = false;
    let isVercelTxtVerified = false;

    if (txtRecords) {
      // Check for our custom TXT record
      isTxtVerified = txtRecords.some((record: any) => {
        if (typeof record === 'string') {
          return record === expectedTxtValue;
        }
        if (record && typeof record.value === 'string') {
          return record.value === expectedTxtValue;
        }
        if (record && Array.isArray(record.txt) && record.txt.length > 0) {
          return record.txt.some((txt: string) => txt === expectedTxtValue);
        }
        return false;
      });
    }

    if (vercelTxtRecords) {
      isVercelTxtVerified = vercelTxtRecords.some((record: any) => {
        if (typeof record === 'string') {
          return record === expectedVercelTxtValue;
        }
        if (record && typeof record.value === 'string') {
          return record.value === expectedVercelTxtValue;
        }
        if (record && Array.isArray(record.txt) && record.txt.length > 0) {
          return record.txt.some((txt: string) => txt === expectedVercelTxtValue);
        }
        return false;
      });
    }

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
