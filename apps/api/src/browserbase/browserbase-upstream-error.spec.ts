import { ServiceUnavailableException } from '@nestjs/common';
import {
  browserbaseUnavailableException,
  isRetryableBrowserbaseUpstreamError,
} from './browserbase-upstream-error';

describe('browserbase upstream errors', () => {
  it('treats premature close as retryable', () => {
    const error = Object.assign(new Error('Premature close'), {
      code: 'ERR_STREAM_PREMATURE_CLOSE',
      errno: 'ERR_STREAM_PREMATURE_CLOSE',
    });

    expect(isRetryableBrowserbaseUpstreamError(error)).toBe(true);
  });

  it('treats upstream 5xx responses as retryable', () => {
    expect(isRetryableBrowserbaseUpstreamError({ status: 502 })).toBe(true);
  });

  it('uses a stable request-facing unavailable exception', () => {
    const error = browserbaseUnavailableException();

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).toBe(
      'Browserbase is temporarily unavailable. Please retry in a moment.',
    );
  });
});
