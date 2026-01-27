import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateFindingTemplateIdPipe implements PipeTransform {
  transform(value: string): string {
    // Finding template IDs should match the pattern: fnd_t_[alphanumeric with underscores]
    // Examples: fnd_t_abc123, fnd_t_evidence_issue_01
    const findingTemplateIdPattern = /^fnd_t_[a-z0-9_]+$/;

    if (!findingTemplateIdPattern.test(value)) {
      throw new BadRequestException(
        `Invalid finding template ID format. Expected format: fnd_t_[alphanumeric_with_underscores]`,
      );
    }

    return value;
  }
}
