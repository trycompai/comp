import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Requires at least `minimum` non-whitespace characters anywhere in the value.
 *
 * Counts matches of a global `/\S/` scan instead of describing the shape with
 * one pattern. The pattern this replaces, `/(?:\S.*?){20}/s`, nested a lazy
 * quantifier inside a counted group, so the engine retried every way to split a
 * whitespace run across the twenty repetitions. Nineteen letters followed by
 * 800 spaces cost about 1.6 s, and 4,000 spaces about 8 s. The scan below stops
 * as soon as it finds the minimum, so a normal reason costs about 0.01 ms and a
 * whitespace-only body costs time in its length only.
 */
@ValidatorConstraint({ name: 'minNonWhitespaceLength', async: false })
export class MinNonWhitespaceLengthConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return false;

    const minimum = args.constraints[0] as number;
    // A fresh regex per call: a shared one would carry `lastIndex` between
    // validations.
    const nonWhitespace = /\S/g;
    let found = 0;

    while (nonWhitespace.exec(value) !== null) {
      found += 1;
      if (found >= minimum) return true;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    const minimum = args.constraints[0] as number;
    return `${args.property} must contain at least ${minimum} non-whitespace characters`;
  }
}

export function MinNonWhitespaceLength(
  minimum: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [minimum],
      validator: MinNonWhitespaceLengthConstraint,
    });
  };
}
