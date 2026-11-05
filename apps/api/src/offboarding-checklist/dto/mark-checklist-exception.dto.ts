import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class MarkChecklistExceptionDto {
  @ApiProperty({
    description:
      'Why this offboarding step is being marked as an exception (could not or need not be done). Required and non-empty.',
    example: 'This person was never issued a company device.',
  })
  @IsString()
  @IsNotEmpty()
  // Reject whitespace-only reasons — an exception must be justified.
  @Matches(/\S/, { message: 'reason must not be empty' })
  reason!: string;
}
