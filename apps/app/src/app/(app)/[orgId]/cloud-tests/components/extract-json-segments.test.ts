import { describe, expect, it } from 'vitest';
import {
  extractJsonSegments,
  findBalancedEnd,
} from './extract-json-segments';

describe('findBalancedEnd', () => {
  it('returns null when the position is not an opener', () => {
    expect(findBalancedEnd('hello { world }', 0)).toBeNull();
  });

  it('finds the closing brace of a flat object', () => {
    const t = 'pre {"a":1} post';
    const start = t.indexOf('{');
    const end = findBalancedEnd(t, start);
    expect(end).not.toBeNull();
    expect(t.slice(start, (end as number) + 1)).toBe('{"a":1}');
  });

  it('handles nested objects to arbitrary depth', () => {
    const t = '{"a":{"b":{"c":{"d":1}}}}';
    expect(findBalancedEnd(t, 0)).toBe(t.length - 1);
  });

  it('handles arrays containing objects', () => {
    const t = '[{"a":1},{"b":2}]';
    expect(findBalancedEnd(t, 0)).toBe(t.length - 1);
  });

  it('ignores braces that live inside string literals', () => {
    const t = '{"key":"value with } and { inside"}';
    expect(findBalancedEnd(t, 0)).toBe(t.length - 1);
  });

  it('handles escaped quotes inside string literals', () => {
    const t = '{"key":"with \\"escaped\\" quotes"}';
    expect(findBalancedEnd(t, 0)).toBe(t.length - 1);
  });

  it('returns null when braces never balance', () => {
    expect(findBalancedEnd('{"unclosed":1', 0)).toBeNull();
  });
});

describe('extractJsonSegments', () => {
  it('returns the original string as a single text segment when there is no JSON', () => {
    const result = extractJsonSegments('Open the AWS Console and create a trail.');
    expect(result).toEqual([
      { type: 'text', value: 'Open the AWS Console and create a trail.' },
    ]);
  });

  it('splits prose + flat JSON object into ordered segments', () => {
    const result = extractJsonSegments(
      'Apply this policy: {"Version":"2012-10-17"} and verify.',
    );
    expect(result).toEqual([
      { type: 'text', value: 'Apply this policy: ' },
      {
        type: 'json',
        raw: '{"Version":"2012-10-17"}',
        pretty: JSON.stringify({ Version: '2012-10-17' }, null, 2),
      },
      { type: 'text', value: ' and verify.' },
    ]);
  });

  it('handles the customer-reported CloudTrail bucket policy (2 statements, Principal + Condition nested)', () => {
    // Exact shape from Simon's screenshot. The previous regex-based
    // splitter would have extracted only the first Statement object,
    // leaving the outer wrapper and second Statement as plain text.
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AWSCloudTrailAclCheck',
          Effect: 'Allow',
          Principal: { Service: 'cloudtrail.amazonaws.com' },
          Action: 's3:GetBucketAcl',
          Resource: 'arn:aws:s3:::BUCKETNAME',
        },
        {
          Sid: 'AWSCloudTrailWrite',
          Effect: 'Allow',
          Principal: { Service: 'cloudtrail.amazonaws.com' },
          Action: 's3:PutObject',
          Resource: 'arn:aws:s3:::BUCKETNAME/AWSLogs/ACCOUNTID/*',
          Condition: {
            StringEquals: { 's3:x-amz-acl': 'bucket-owner-full-control' },
          },
        },
      ],
    };
    const text = `In the S3 bucket you just created, go to the Permissions tab and add this bucket policy: ${JSON.stringify(policy)}`;

    const result = extractJsonSegments(text);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: 'text',
      value:
        'In the S3 bucket you just created, go to the Permissions tab and add this bucket policy: ',
    });
    expect(result[1]?.type).toBe('json');
    if (result[1]?.type === 'json') {
      // Round-trip — the helper must extract the FULL policy, not a partial slice.
      expect(JSON.parse(result[1].raw)).toEqual(policy);
    }
  });

  it('extracts multiple JSON blocks in the same string', () => {
    const text = 'first: {"a":1} then: {"b":2} done';
    const result = extractJsonSegments(text);
    expect(result.map((s) => s.type)).toEqual([
      'text',
      'json',
      'text',
      'json',
      'text',
    ]);
  });

  it('extracts JSON arrays as well as objects', () => {
    const result = extractJsonSegments('See: [{"x":1},{"y":2}]');
    expect(result).toHaveLength(2);
    expect(result[1]?.type).toBe('json');
  });

  it('falls through to text when balanced braces are not valid JSON', () => {
    // `{ not json }` has balanced braces but isn't parseable.
    const result = extractJsonSegments('here: { not json } ok');
    expect(result.every((s) => s.type === 'text')).toBe(true);
    const joined = result
      .map((s) => (s.type === 'text' ? s.value : ''))
      .join('');
    expect(joined).toBe('here: { not json } ok');
  });

  it('falls through to text when braces are unbalanced', () => {
    const result = extractJsonSegments('broken: {"a":1 still text');
    expect(result.every((s) => s.type === 'text')).toBe(true);
  });

  it('does NOT misclassify braces inside JSON string values', () => {
    // The `}` inside the description must not terminate the JSON early.
    const text =
      'Apply: {"description":"contains } and { in text","key":"v"}';
    const result = extractJsonSegments(text);
    const jsonSegments = result.filter((s) => s.type === 'json');
    expect(jsonSegments).toHaveLength(1);
    if (jsonSegments[0]?.type === 'json') {
      const parsed = JSON.parse(jsonSegments[0].raw);
      expect(parsed.description).toBe('contains } and { in text');
    }
  });

  it('handles a JSON block at the very start of the string', () => {
    const result = extractJsonSegments('{"a":1} trailing');
    expect(result).toEqual([
      {
        type: 'json',
        raw: '{"a":1}',
        pretty: JSON.stringify({ a: 1 }, null, 2),
      },
      { type: 'text', value: ' trailing' },
    ]);
  });

  it('handles a JSON block at the very end of the string', () => {
    const result = extractJsonSegments('leading {"a":1}');
    expect(result[0]).toEqual({ type: 'text', value: 'leading ' });
    expect(result[1]?.type).toBe('json');
  });

  it('pretty-prints with 2-space indentation', () => {
    const result = extractJsonSegments('{"a":1,"b":[1,2]}');
    expect(result[0]?.type).toBe('json');
    if (result[0]?.type === 'json') {
      expect(result[0].pretty).toBe(JSON.stringify({ a: 1, b: [1, 2] }, null, 2));
      expect(result[0].pretty).toContain('\n');
    }
  });
});
