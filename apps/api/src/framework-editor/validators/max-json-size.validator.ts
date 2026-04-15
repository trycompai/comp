import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

const DEFAULT_MAX_BYTES = 512_000; // 500 KB

@ValidatorConstraint({ name: 'maxJsonSize', async: false })
export class MaxJsonSizeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === null || value === undefined) return true;
    try {
      const serialized = JSON.stringify(value);
      const maxBytes = (args.constraints[0] as number) ?? DEFAULT_MAX_BYTES;
      return serialized.length <= maxBytes;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const maxBytes = (args.constraints[0] as number) ?? DEFAULT_MAX_BYTES;
    const maxKb = Math.round(maxBytes / 1000);
    return `JSON content exceeds maximum allowed size of ${maxKb}KB`;
  }
}

export function MaxJsonSize(
  maxBytes?: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [maxBytes ?? DEFAULT_MAX_BYTES],
      validator: MaxJsonSizeConstraint,
    });
  };
}
