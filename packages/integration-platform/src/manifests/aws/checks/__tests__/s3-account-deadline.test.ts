import { GetPublicAccessBlockCommand, ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import { S3ControlClient } from '@aws-sdk/client-s3-control';
import { afterEach, describe, expect, it, jest, mock, spyOn } from 'bun:test';
import type { CheckContext, CheckFindingResult, CheckPassingResult } from '../../../../types';
import { s3PublicAccessCheck } from '../s3';

async function unexpectedRequest(): Promise<never> {
  throw new Error('unexpected network or persistent-state operation');
}

function makeContext() {
  const passes: CheckPassingResult[] = [];
  const failures: CheckFindingResult[] = [];
  const logs: string[] = [];
  const context: CheckContext = {
    accessToken: '',
    credentials: {
      roleArn: 'arn:aws:iam::123456789012:role/example',
      externalId: 'synthetic',
      regions: ['us-east-1'],
      __resolvedAccessKeyId: 'synthetic',
      __resolvedSecretAccessKey: 'synthetic',
      __resolvedSessionToken: 'synthetic',
    },
    variables: {},
    connectionId: 'synthetic-connection',
    organizationId: 'synthetic-organization',
    checkId: 'aws-s3-public-access',
    log: (message) => {
      logs.push(message);
    },
    warn: () => {},
    error: () => {},
    pass: (result) => {
      passes.push(result);
    },
    fail: (result) => {
      failures.push(result);
    },
    addPassingResult: () => {},
    addFinding: () => {},
    fetch: unexpectedRequest,
    post: unexpectedRequest,
    put: unexpectedRequest,
    patch: unexpectedRequest,
    delete: unexpectedRequest,
    graphql: unexpectedRequest,
    fetchAllPages: unexpectedRequest,
    fetchWithCursor: unexpectedRequest,
    fetchWithLinkHeader: unexpectedRequest,
    getState: unexpectedRequest,
    setState: unexpectedRequest,
  };
  return { context, passes, failures, logs };
}

afterEach(() => {
  mock.restore();
  jest.useRealTimers();
});

describe('S3 account-level read deadline', () => {
  it('still emits every bucket result when the account-level request never settles', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    const accountRead = spyOn(S3ControlClient.prototype, 'send').mockImplementation(
      (_command: unknown, options?: unknown) => {
        if (
          options &&
          typeof options === 'object' &&
          'abortSignal' in options &&
          options.abortSignal instanceof AbortSignal
        ) {
          signal = options.abortSignal;
        }
        return new Promise<never>(() => {});
      },
    );
    const bucketRead = spyOn(S3Client.prototype, 'send').mockImplementation(
      async (command: unknown) => {
        if (command instanceof ListBucketsCommand) {
          return { Buckets: [{ Name: 'protected' }, { Name: 'unprotected' }] };
        }
        if (!(command instanceof GetPublicAccessBlockCommand))
          throw new Error('unexpected command');
        return {
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: command.input.Bucket === 'protected',
            IgnorePublicAcls: command.input.Bucket === 'protected',
            BlockPublicPolicy: command.input.Bucket === 'protected',
            RestrictPublicBuckets: command.input.Bucket === 'protected',
          },
        };
      },
    );
    const { context, passes, failures, logs } = makeContext();
    let done = false;
    const result = s3PublicAccessCheck.run(context).then(() => {
      done = true;
    });
    for (let index = 0; index < 30; index++) await Promise.resolve();
    expect(accountRead).toHaveBeenCalledTimes(1);
    expect(bucketRead).not.toHaveBeenCalled();
    jest.advanceTimersByTime(30_000);
    for (let index = 0; index < 100; index++) await Promise.resolve();

    expect(done).toBe(true);
    await result;
    expect(signal?.aborted).toBe(true);
    expect(passes.map((result) => result.resourceId)).toEqual(['protected']);
    expect(failures.map((result) => result.resourceId)).toEqual(['unprotected']);
    expect(failures[0]?.severity).toBe('high');
    expect(logs.some((message) => message.includes('time budget'))).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
});
