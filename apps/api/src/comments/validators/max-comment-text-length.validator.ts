import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { extractCommentPlainText } from '../utils/extract-comment-plain-text';

const DEFAULT_MAX_LENGTH = 2000;

/**
 * Validates comment `content` against the visible text length rather than
 * the raw stored string — `content` is serialized Tiptap JSON, so formatting
 * (marks, node types, attrs) would otherwise count toward the limit and
 * reject short, plainly-visible comments once they include any formatting.
 *
 * Also rejects zero visible text: `@IsNotEmpty()` only sees the raw string,
 * so an empty document (e.g. `{"type":"doc","content":[]}`) is a non-empty
 * JSON string that would otherwise sail through as a "valid" empty comment.
 */
@ValidatorConstraint({ name: 'maxCommentTextLength', async: false })
export class MaxCommentTextLengthConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return false;
    const maxLength = (args.constraints[0] as number) ?? DEFAULT_MAX_LENGTH;
    const length = [...extractCommentPlainText(value)].length;
    return length > 0 && length <= maxLength;
  }

  defaultMessage(args: ValidationArguments): string {
    const maxLength = (args.constraints[0] as number) ?? DEFAULT_MAX_LENGTH;
    return `content must not be empty and must not exceed ${maxLength} characters`;
  }
}

export function MaxCommentTextLength(
  maxLength: number = DEFAULT_MAX_LENGTH,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [maxLength],
      validator: MaxCommentTextLengthConstraint,
    });
  };
}
