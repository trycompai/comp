import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateFindingTemplateIdPipe implements PipeTransform {
  transform(value: string): string {
    // Finding template IDs should match the pattern: fnd_t_[cuid]
    const findingTemplateIdPattern = /^fnd_t_[a-z0-9]+$/;

    if (!findingTemplateIdPattern.test(value)) {
      throw new BadRequestException(
        `Invalid finding template ID format. Expected format: fnd_t_[alphanumeric]`,
      );
    }

    return value;
  }
}
