import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateFindingIdPipe implements PipeTransform {
  transform(value: string): string {
    // Finding IDs should match the pattern: fnd_[cuid]
    const findingIdPattern = /^fnd_[a-z0-9]+$/;

    if (!findingIdPattern.test(value)) {
      throw new BadRequestException(
        `Invalid finding ID format. Expected format: fnd_[alphanumeric]`,
      );
    }

    return value;
  }
}
