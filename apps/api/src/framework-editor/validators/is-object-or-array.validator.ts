import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Accepts any non-null object OR array. Unlike class-validator's `@IsObject`
 * (which explicitly rejects arrays), this allows both shapes — needed for
 * TipTap content, which is legitimately stored either as a `{ type: 'doc', … }`
 * object or as a bare array of ProseMirror nodes.
 */
@ValidatorConstraint({ name: 'isObjectOrArray', async: false })
export class IsObjectOrArrayConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'object' && value !== null;
  }

  defaultMessage(): string {
    return 'value must be an object or an array';
  }
}

export function IsObjectOrArray(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsObjectOrArrayConstraint,
    });
  };
}
