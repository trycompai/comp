import { queue, schemaTask } from '@trigger.dev/sdk';
import { TrustEmailService } from '../../trust-portal/email.service';
import { trustAccessSubmissionSchema } from '../../trust-portal/trust-access-submission';
import { processTrustAccessSubmissionPayload } from '../../trust-portal/trust-access-submission.processor';

// concurrencyKey partitions this queue by portal + email. Both operations for
// one recipient run serially, so retries/submissions cannot create duplicates.
const accessSubmissionQueue = queue({
  name: 'trust-portal-access-submissions',
  concurrencyLimit: 1,
});

export const processTrustAccessSubmission = schemaTask({
  id: 'trust-portal-process-access-submission',
  schema: trustAccessSubmissionSchema,
  queue: accessSubmissionQueue,
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload, { ctx }) => {
    await processTrustAccessSubmissionPayload({
      payload,
      runId: ctx.run.id,
      emailService: new TrustEmailService(),
    });
  },
});
