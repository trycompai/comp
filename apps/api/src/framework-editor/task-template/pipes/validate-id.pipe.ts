import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    // Validate that the ID is not empty
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('ID must be a non-empty string');
    }

    // Validate CUID format with prefix 'frk_tt_'
    const cuidRegex = /^frk_tt_[a-z0-9]+$/i;
    if (!cuidRegex.test(value)) {
      throw new BadRequestException(
        'Invalid ID format. Expected format: frk_tt_[alphanumeric]',
      );
    }

    return value;
  }
}
