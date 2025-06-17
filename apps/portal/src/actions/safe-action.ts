import { auth } from '@/app/lib/auth';
import { env } from '@/env.mjs';
import { logger } from '@/utils/logger';
import { client } from '@comp/kv';
import { Ratelimit } from '@upstash/ratelimit';
import { DEFAULT_SERVER_ERROR_MESSAGE, createSafeActionClient } from 'next-safe-action';
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
    if (e instanceof Error) {
      return e.message;
    }

    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
  defineMetadataSchema() {
    return z.object({
      name: z.string(),
      ip: z.string().optional(),
      userAgent: z.string().optional(),
      track: z
        .object({
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

    if (process.env.NODE_ENV === 'development') {
      logger('Input ->', clientInput as string);
      logger('Result ->', result.data as string);

      return result;
    }

    return result;
  })
  .use(async ({ next, metadata }) => {
    if (!ratelimit) {
      return next({});
    }

    const headersList = await headers();

    const { success, remaining: rateLimitRemaining } = await ratelimit.limit(
      `${headersList.get('x-forwarded-for')}-${metadata.name}`,
    );

    if (!success) {
      throw new Error('Too many requests');
    }

    return next({
      ctx: {
        ip: headersList.get('x-forwarded-for'),
        userAgent: headersList.get('user-agent'),
        ratelimit: {
          remaining: rateLimitRemaining,
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

    // try {
    // 	const auditData = {
    // 		userId: session.user.id,
    // 		email: session.user.email,
    // 		name: session.user.name,
    // 		organizationId: session.session.activeOrganizationId,
    // 		action: metadata.name,
    // 		ip: ctx.ip,
    // 		userAgent: ctx.userAgent,
    // 	};

    // 	await db.auditLog.create({
    // 		data: {
    // 			data: auditData,
    // 			userId: session.user.id,
    // 			organizationId: session.session.activeOrganizationId,
    // 		},
    // 	});

    // 	if (metadata.track) {
    // 		track(session.user.id, metadata.track.event, {
    // 			channel: metadata.track.channel,
    // 			email: session.user.email,
    // 			name: session.user.name,
    // 			organizationId: session.session.activeOrganizationId,
    // 		});
    // 	}
    // } catch (error) {
    // 	logger("Audit log error:", error);
    // }

    return next({
      ctx: {
        user: session.user,
      },
    });
  });
