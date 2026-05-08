import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

// RFC 6838 restricted-name-chars set (alpha, digit, !, #, $, &, -, ^, _, ., +)
// First char must be alpha/digit.
const MIME_TYPE_REGEX =
  /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;

/**
 * Normalize a Content-Type / MIME value to its bare `type/subtype` form:
 * strips optional `;parameters` (RFC 7231) and surrounding whitespace,
 * and lowercases the result.
 */
export const normalizeMimeType = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const bare = value.split(';')[0]?.trim().toLowerCase() ?? '';
  return bare;
};

/**
 * Decorator for DTO fields that accept a file MIME type.
 * Normalizes the value (strip parameters, trim, lowercase) before validating
 * it against the RFC 6838 restricted-name-chars grammar.
 */
export const IsMimeTypeField = (): PropertyDecorator =>
  applyDecorators(
    IsString(),
    IsNotEmpty(),
    Transform(({ value }) => normalizeMimeType(value)),
    Matches(MIME_TYPE_REGEX, { message: 'Invalid MIME type format' }),
  );
