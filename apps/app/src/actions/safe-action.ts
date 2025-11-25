import { track } from '@/app/posthog';
import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import { logger } from '@/utils/logger';
import { client } from '@comp/kv';
import { AuditLogEntityType, db } from '@db';
import { Ratelimit } from '@upstash/ratelimit';
import { DEFAULT_SERVER_ERROR_MESSAGE, createSafeActionClient } from 'next-safe-action';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

let ratelimit: Ratelimit | undefined;

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    limiter: Ratelimit.fixedWindow(10, '10s'),
    redis: client,
  });
}

export const actionClientWithMeta = createSafeActionClient({
  handleServerError(e) {
    // Log the error for debugging
    logger.error('Server error:', e);

    // Throw the error instead of returning it
    if (e instanceof Error) {
      throw e;
    }

    throw new Error(DEFAULT_SERVER_ERROR_MESSAGE);
  },
  // Add this to throw validation errors
  throwValidationErrors: true,
  defineMetadataSchema() {
    return z.object({
      name: z.string(),
      ip: z.string().optional(),
      userAgent: z.string().optional(),
      track: z
        .object({
          description: z.string().optional(),
          event: z.string(),
          channel: z.string(),
        })
        .optional(),
    });
  },
});

export const authActionClient = actionClientWithMeta
  .use(async ({ next, clientInput }) => {
    const response = await auth.api.getSession({
      headers: await headers(),
    });

    const { session, user } = response ?? {};

    if (!session) {
      throw new Error('Unauthorized');
    }

    const result = await next({
      ctx: {
        user: user,
        session: session,
      },
    });

    const { fileData: _, ...inputForLog } = (clientInput || {}) as any;
    logger.info('Input ->', JSON.stringify(inputForLog, null, 2));
    logger.info('Result ->', JSON.stringify(result.data, null, 2));

    // Also log validation errors if they exist
    if (result.validationErrors) {
      logger.warn('Validation Errors ->', JSON.stringify(result.validationErrors, null, 2));
    }

    return result;
  })
  .use(async ({ next, metadata, ctx }) => {
    const headersList = await headers();
    let remaining: number | undefined;

    // Exclude answer saving actions from rate limiting
    // These actions are user-initiated and should not be rate limited
    const excludedActions = [
      'save-questionnaire-answer',
      'update-questionnaire-answer',
      'save-manual-answer',
      'save-questionnaire-answers-batch',
    ];

    const shouldRateLimit = !excludedActions.includes(metadata.name);

    if (ratelimit && shouldRateLimit) {
      const { success, remaining: rateLimitRemaining } = await ratelimit.limit(
        `${headersList.get('x-forwarded-for')}-${metadata.name}`,
      );

      if (!success) {
        throw new Error('Too many requests');
      }

      remaining = rateLimitRemaining;
    }

    return next({
      ctx: {
        ...ctx,
        ip: headersList.get('x-forwarded-for'),
        userAgent: headersList.get('user-agent'),
        ratelimit: {
          remaining: remaining ?? 0,
        },
      },
    });
  })
  .use(async ({ next, metadata, ctx }) => {
    // Use user and session from previous middleware instead of re-fetching
    // This ensures consistency and avoids potential security issues from stale data
    if (!ctx.user || !ctx.session) {
      throw new Error('Unauthorized');
    }

    if (metadata.track) {
      track(ctx.user.id, metadata.track.event, {
        channel: metadata.track.channel,
        email: ctx.user.email,
        name: ctx.user.name,
        organizationId: ctx.session.activeOrganizationId,
      });
    }

    return next({ ctx });
  })
  .use(async ({ next, metadata, clientInput, ctx }) => {
    const headersList = await headers();
    
    // Use user and session from previous middleware for consistency
    // Only fetch activeMember as it may require fresh data
    if (!ctx.user || !ctx.session) {
      throw new Error('Unauthorized');
    }

    if (!ctx.session.activeOrganizationId) {
      throw new Error('Organization not found');
    }

    const member = await auth.api.getActiveMember({
      headers: headersList,
    });

    if (!member) {
      throw new Error('Member not found');
    }

    const { fileData: _, ...inputForAuditLog } = (clientInput || {}) as any;

    const data = {
      userId: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      organizationId: ctx.session.activeOrganizationId,
      action: metadata.name,
      input: inputForAuditLog,
      ipAddress: headersList.get('x-forwarded-for') || null,
      userAgent: headersList.get('user-agent') || null,
    };

    const entityId = (clientInput as { entityId: string })?.entityId || null;

    let entityType = null;

    const mapEntityType: Record<string, AuditLogEntityType> = {
      pol_: AuditLogEntityType.policy,
      ctl_: AuditLogEntityType.control,
      tsk_: AuditLogEntityType.task,
      vnd_: AuditLogEntityType.vendor,
      rsk_: AuditLogEntityType.risk,
      org_: AuditLogEntityType.organization,
      frm_: AuditLogEntityType.framework,
      req_: AuditLogEntityType.requirement,
      mem_: AuditLogEntityType.people,
      itr_: AuditLogEntityType.tests,
      int_: AuditLogEntityType.integration,
      frk_rq_: AuditLogEntityType.framework,
      frk_ctrl_: AuditLogEntityType.framework,
      frk_req_: AuditLogEntityType.framework,
    };

    if (entityId) {
      const parts = entityId.split('_');
      const prefix = `${parts[0]}_`;

      // Handle special case prefixes with multiple parts
      if (parts.length > 2) {
        const complexPrefix = `${prefix}${parts[1]}_`;
        entityType = mapEntityType[complexPrefix] || mapEntityType[prefix] || null;
      } else {
        entityType = mapEntityType[prefix] || null;
      }
    }

    try {
      await db.auditLog.create({
        data: {
          data: JSON.stringify(data),
          memberId: member.id,
          userId: ctx.user.id,
          description: metadata.track?.description || null,
          organizationId: ctx.session.activeOrganizationId,
          entityId,
          entityType,
        },
      });
    } catch (error) {
      logger.error('Audit log error:', error);
    }

    // Add revalidation logic based on the cursor rules
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');

    revalidatePath(path);

    return next({ ctx });
  });

// New action client that includes organization access check
export const authWithOrgAccessClient = authActionClient.use(async ({ next, clientInput, ctx }) => {
  // Extract organizationId from the input
  const organizationId = (clientInput as { organizationId?: string })?.organizationId;

  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  // Check if user is a member of the organization
  const member = await db.member.findFirst({
    where: {
      userId: ctx.user.id,
      organizationId,
      deactivated: false,
    },
  });

  if (!member) {
    throw new Error('You do not have access to this organization');
  }

  return next({
    ctx: {
      ...ctx,
      member,
      organizationId,
    },
  });
});

// New action client that requires auth but not an active organization
export const authActionClientWithoutOrg = actionClientWithMeta
  .use(async ({ next, clientInput }) => {
    const response = await auth.api.getSession({
      headers: await headers(),
    });

    const { session, user } = response ?? {};

    if (!session) {
      throw new Error('Unauthorized');
    }

    const result = await next({
      ctx: {
        user: user,
        session: session,
      },
    });

    const { fileData: _, ...inputForLog } = (clientInput || {}) as any;
    logger.info('Input ->', JSON.stringify(inputForLog, null, 2));
    logger.info('Result ->', JSON.stringify(result.data, null, 2));

    // Also log validation errors if they exist
    if (result.validationErrors) {
      logger.warn('Validation Errors ->', JSON.stringify(result.validationErrors, null, 2));
    }

    return result;
  })
  .use(async ({ next, metadata, ctx }) => {
    const headersList = await headers();
    let remaining: number | undefined;

    // Exclude answer saving actions from rate limiting
    // These actions are user-initiated and should not be rate limited
    const excludedActions = [
      'save-questionnaire-answer',
      'update-questionnaire-answer',
      'save-manual-answer',
      'save-questionnaire-answers-batch',
    ];

    const shouldRateLimit = !excludedActions.includes(metadata.name);

    if (ratelimit && shouldRateLimit) {
      const { success, remaining: rateLimitRemaining } = await ratelimit.limit(
        `${headersList.get('x-forwarded-for')}-${metadata.name}`,
      );

      if (!success) {
        throw new Error('Too many requests');
      }

      remaining = rateLimitRemaining;
    }

    return next({
      ctx: {
        ...ctx,
        ip: headersList.get('x-forwarded-for'),
        userAgent: headersList.get('user-agent'),
        ratelimit: {
          remaining: remaining ?? 0,
        },
      },
    });
  })
  .use(async ({ next, metadata, ctx }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new Error('Unauthorized');
    }

    if (metadata.track) {
      track(session.user.id, metadata.track.event, {
        channel: metadata.track.channel,
        email: session.user.email,
        name: session.user.name,
        // organizationId is optional here since there might not be one
        organizationId: session.session.activeOrganizationId || undefined,
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: session.user,
      },
    });
  });
